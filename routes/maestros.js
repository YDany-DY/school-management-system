const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
    obtenerBaseUsuario,
    generarUsuarioUnico,
    generarPasswordTemporal
} = require("../utils/userHelpers");

const router = express.Router();

function crearRutasMaestros(verificarSesion, verificarRol) {
    const verificarAdminPersonal = verificarRol("admin", "personal");

    router.get("/api/maestros", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const filtro = {};
            if (req.query.q) {
                const q = String(req.query.q).trim();
                filtro.$or = [
                    { nombre: new RegExp(q, "i") },
                    { correo: new RegExp(q, "i") },
                    { especialidad: new RegExp(q, "i") }
                ];
            }

            const maestros = await mongoose.model("Maestro").find(filtro).sort({ nombre: 1 });
            res.json(maestros);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo maestros" });
        }
    });

    router.get("/api/maestros/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const maestro = await mongoose.model("Maestro").findById(req.params.id);
            if (!maestro) {
                return res.status(404).json({ error: "Maestro no encontrado" });
            }
            res.json(maestro);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo maestro" });
        }
    });

    router.post("/api/maestros", verificarSesion, verificarAdminPersonal, async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const Maestro = mongoose.model("Maestro");
            const Usuario = mongoose.model("Usuario");

            const nombre = String(req.body.nombre || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const especialidad = String(req.body.especialidad || "").trim();
            const estado = String(req.body.estado || "activo").trim();

            if (!nombre || !correo) {
                await session.abortTransaction();
                return res.status(400).json({ error: "Nombre y correo son obligatorios" });
            }

            const correoExistente = await Usuario.exists({ correo }).session(session);
            if (correoExistente) {
                await session.abortTransaction();
                return res.status(400).json({ error: "Ya existe un usuario con ese correo" });
            }

            const baseUsuario = obtenerBaseUsuario(correo, nombre);
            const usuarioGenerado = await generarUsuarioUnico(baseUsuario, Usuario);
            const contrasenaTemporal = req.body.password || generarPasswordTemporal();

            const nuevoUsuario = new Usuario({
                nombre,
                correo,
                usuario: usuarioGenerado,
                password: contrasenaTemporal,
                rol: "maestro",
                activo: estado === "activo",
                estado,
                primerLogin: true,
                fechaRestablecimiento: new Date()
            });

            await nuevoUsuario.save({ session });

            const nuevoMaestro = new Maestro({
                nombre,
                correo,
                especialidad,
                activo: estado === "activo",
                estado
            });

            await nuevoMaestro.save({ session });

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({
                mensaje: "Maestro creado correctamente",
                usuario: usuarioGenerado,
                contrasenaTemporal
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error(error);
            res.status(500).json({ error: "Error creando maestro" });
        }
    });

    router.put("/api/maestros/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const Maestro = mongoose.model("Maestro");
            const Usuario = mongoose.model("Usuario");

            const maestro = await Maestro.findById(req.params.id).session(session);
            if (!maestro) {
                await session.abortTransaction();
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const nombre = String(req.body.nombre || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const especialidad = String(req.body.especialidad || "").trim();
            const estado = String(req.body.estado || "activo").trim();

            if (!nombre || !correo) {
                await session.abortTransaction();
                return res.status(400).json({ error: "Nombre y correo son obligatorios" });
            }

            const usuario = await Usuario.findOne({ correo: maestro.correo }).session(session);
            if (!usuario) {
                await session.abortTransaction();
                return res.status(404).json({ error: "Usuario del maestro no encontrado" });
            }

            const correoDuplicado = await Usuario.findOne({ correo, _id: { $ne: usuario._id } }).session(session);
            if (correoDuplicado) {
                await session.abortTransaction();
                return res.status(400).json({ error: "Ya existe otro usuario con ese correo" });
            }

            usuario.nombre = nombre;
            usuario.correo = correo;
            if (req.body.password) {
                usuario.password = await bcrypt.hash(req.body.password, 10);
                usuario.primerLogin = true;
                usuario.fechaRestablecimiento = new Date();
            }
            await usuario.save({ session });

            maestro.nombre = nombre;
            maestro.correo = correo;
            maestro.especialidad = especialidad;
            maestro.activo = estado === "activo";
            maestro.estado = estado;
            await maestro.save({ session });

            await session.commitTransaction();
            session.endSession();
            res.json({ mensaje: "Maestro actualizado correctamente" });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error(error);
            res.status(500).json({ error: "Error actualizando maestro" });
        }
    });

    router.post("/api/maestros/:id/reset-password", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Maestro = mongoose.model("Maestro");
            const Usuario = mongoose.model("Usuario");

            const maestro = await Maestro.findById(req.params.id);
            if (!maestro) {
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const usuario = await Usuario.findOne({ correo: maestro.correo });
            if (!usuario) {
                return res.status(404).json({ error: "Usuario del maestro no encontrado" });
            }

            const contrasenaTemporal = generarPasswordTemporal();
            usuario.password = await bcrypt.hash(contrasenaTemporal, 10);
            usuario.primerLogin = true;
            usuario.fechaRestablecimiento = new Date();
            await usuario.save();

            res.json({ mensaje: "Contraseña temporal restablecida", usuario: usuario.usuario, contrasenaTemporal });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error restableciendo contraseña" });
        }
    });

    router.delete("/api/maestros/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const Maestro = mongoose.model("Maestro");
            const Usuario = mongoose.model("Usuario");

            const maestro = await Maestro.findById(req.params.id).session(session);
            if (!maestro) {
                await session.abortTransaction();
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            await Maestro.findByIdAndDelete(maestro._id).session(session);
            await Usuario.findOneAndDelete({ correo: maestro.correo }).session(session);

            await session.commitTransaction();
            session.endSession();

            res.json({ mensaje: "Maestro eliminado correctamente" });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error(error);
            res.status(500).json({ error: "Error eliminando maestro" });
        }
    });

    return router;
}

module.exports = crearRutasMaestros;
