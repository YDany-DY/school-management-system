const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
    obtenerBaseUsuario,
    generarUsuarioUnico,
    generarPasswordTemporal
} = require("../utils/userHelpers");

const router = express.Router();

function crearRutasAlumnos(verificarSesion, verificarRol) {
    const verificarAdminPersonal = verificarRol("admin", "personal");

    // Middleware para validar ObjectId
    const validarObjectId = (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "ID de alumno inválido" });
        }
        next();
    };

    router.get("/api/alumnos/opciones", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const grupos = await Grupo.find({ activo: { $ne: false } })
                .select("nombre carrera semestre tutor")
                .sort({ nombre: 1 });

            res.json({ grupos });
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo opciones de alumnos" });
        }
    });

    router.get("/api/alumnos", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Alumno = mongoose.model("Alumno");
            const filtro = {};

            if (req.query.q) {
                const q = String(req.query.q).trim();
                filtro.$or = [
                    { nombre: new RegExp(q, "i") },
                    { matricula: new RegExp(q, "i") },
                    { correo: new RegExp(q, "i") },
                    { carrera: new RegExp(q, "i") }
                ];
            }

            if (req.query.estado) {
                filtro.estado = req.query.estado;
            }

            const alumnos = await Alumno.find(filtro)
                .populate("grupoId", "nombre carrera semestre tutor")
                .sort({ nombre: 1 });

            res.json(alumnos);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo alumnos" });
        }
    });

    router.get("/api/alumnos/:id", verificarSesion, verificarAdminPersonal, validarObjectId, async (req, res) => {
        try {
            const Alumno = mongoose.model("Alumno");
            const alumno = await Alumno.findById(req.params.id)
                .populate("grupoId", "nombre carrera semestre tutor");

            if (!alumno) {
                return res.status(404).json({ error: "Alumno no encontrado" });
            }

            res.json(alumno);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo alumno" });
        }
    });

    router.post("/api/alumnos", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Usuario = mongoose.model("Usuario");
            const Alumno = mongoose.model("Alumno");
            const Grupo = mongoose.model("Grupo");

            const nombre = String(req.body.nombre || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const matricula = String(req.body.matricula || "").trim();
            const carrera = String(req.body.carrera || "").trim();
            const semestre = Number(req.body.semestre);
            const grupoId = req.body.grupoId || null;
            const estado = String(req.body.estado || "activo").trim();

            if (!nombre || !matricula || !carrera || !semestre) {
                return res.status(400).json({ error: "Nombre, matrícula, carrera y semestre son obligatorios" });
            }

            if (semestre < 1) {
                return res.status(400).json({ error: "El semestre debe ser un número válido" });
            }

            const existeMatricula = await Alumno.exists({ matricula });
            if (existeMatricula) {
                return res.status(400).json({ error: "Ya existe un alumno con esa matrícula" });
            }

            if (correo) {
                const existeCorreo = await Usuario.exists({ correo });
                if (existeCorreo) {
                    return res.status(400).json({ error: "Ya existe un usuario registrado con ese correo" });
                }
            }

            let grupo = null;
            if (grupoId) {
                grupo = await Grupo.findById(grupoId);
                if (!grupo) {
                    return res.status(404).json({ error: "Grupo seleccionado no existe" });
                }
            }

            const baseUsuario = obtenerBaseUsuario(correo, nombre) || matricula;
            const usuarioGenerado = await generarUsuarioUnico(baseUsuario, Usuario);
            const passwordTemporal = req.body.password || generarPasswordTemporal();

            const nuevoUsuario = new Usuario({
                nombre,
                correo,
                usuario: usuarioGenerado,
                password: passwordTemporal,
                rol: "alumno",
                activo: estado === "activo",
                estado,
                primerLogin: true,
                fechaRestablecimiento: new Date()
            });

            await nuevoUsuario.save();

            const nuevoAlumno = new Alumno({
                nombre,
                correo,
                matricula,
                carrera,
                semestre,
                grupoId: grupo ? grupo._id : null,
                usuarioId: nuevoUsuario._id,
                rol: "alumno",
                activo: estado === "activo",
                estado
            });

            await nuevoAlumno.save();

            res.status(201).json({
                mensaje: "Alumno creado correctamente",
                usuario: usuarioGenerado,
                contrasenaTemporal: passwordTemporal
            });
        } catch (error) {
            console.error("Error creando alumno:", error);
            res.status(500).json({ error: "Error creando alumno" });
        }
    });

    router.put("/api/alumnos/:id", verificarSesion, verificarAdminPersonal, validarObjectId, async (req, res) => {
        try {
            const Usuario = mongoose.model("Usuario");
            const Alumno = mongoose.model("Alumno");
            const Grupo = mongoose.model("Grupo");

            const alumnoActual = await Alumno.findById(req.params.id);
            if (!alumnoActual) {
                return res.status(404).json({ error: "Alumno no encontrado" });
            }

            const nombre = String(req.body.nombre || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const matricula = String(req.body.matricula || "").trim();
            const carrera = String(req.body.carrera || "").trim();
            const semestre = Number(req.body.semestre);
            const grupoId = req.body.grupoId || null;
            const estado = String(req.body.estado || "activo").trim();

            if (!nombre || !matricula || !carrera || !semestre) {
                return res.status(400).json({ error: "Nombre, matrícula, carrera y semestre son obligatorios" });
            }

            if (semestre < 1) {
                return res.status(400).json({ error: "El semestre debe ser un número válido" });
            }

            const duplicadoMatricula = await Alumno.findOne({ matricula, _id: { $ne: alumnoActual._id } });
            if (duplicadoMatricula) {
                return res.status(400).json({ error: "Ya existe otro alumno con esa matrícula" });
            }

            let usuarioActual = null;
            if (alumnoActual.usuarioId) {
                usuarioActual = await Usuario.findById(alumnoActual.usuarioId);
            }

            if (!usuarioActual) {
                usuarioActual = await Usuario.findOne({ usuario: alumnoActual.matricula });
            }

            if (!usuarioActual) {
                return res.status(404).json({ error: "Usuario del alumno no encontrado" });
            }

            if (correo) {
                const duplicadoCorreo = await Usuario.findOne({ correo, _id: { $ne: usuarioActual._id } });
                if (duplicadoCorreo) {
                    return res.status(400).json({ error: "Ya existe otro usuario con ese correo" });
                }
            }

            let grupo = null;
            if (grupoId) {
                grupo = await Grupo.findById(grupoId);
                if (!grupo) {
                    return res.status(404).json({ error: "Grupo seleccionado no existe" });
                }
            }

            usuarioActual.nombre = nombre;
            usuarioActual.correo = correo;
            if (req.body.password) {
                usuarioActual.password = await bcrypt.hash(req.body.password, 10);
                usuarioActual.primerLogin = true;
                usuarioActual.fechaRestablecimiento = new Date();
            }
            await usuarioActual.save();

            alumnoActual.nombre = nombre;
            alumnoActual.correo = correo;
            alumnoActual.matricula = matricula;
            alumnoActual.carrera = carrera;
            alumnoActual.semestre = semestre;
            alumnoActual.grupoId = grupo ? grupo._id : null;
            alumnoActual.activo = estado === "activo";
            alumnoActual.estado = estado;

            await alumnoActual.save();

            res.json({ mensaje: "Alumno actualizado correctamente" });
        } catch (error) {
            console.error("Error actualizando alumno:", error);
            res.status(500).json({ error: "Error actualizando alumno" });
        }
    });

    router.delete("/api/alumnos/:id", verificarSesion, verificarAdminPersonal, validarObjectId, async (req, res) => {
        try {
            const Usuario = mongoose.model("Usuario");
            const Alumno = mongoose.model("Alumno");

            const alumnoId = String(req.params.id);

            const alumnoActual = await Alumno.findById(alumnoId).lean();
            if (!alumnoActual) {
                return res.status(404).json({ error: "Alumno no encontrado" });
            }

            // Eliminar usuario asociado si existe
            if (alumnoActual.usuarioId && mongoose.Types.ObjectId.isValid(String(alumnoActual.usuarioId))) {
                try {
                    await Usuario.findByIdAndDelete(String(alumnoActual.usuarioId));
                } catch (usuarioError) {
                    console.error("Error eliminando usuario asociado:", usuarioError);
                    // Continuar incluso si falla la eliminación del usuario
                }
            } else {
                try {
                    await Usuario.findOneAndDelete({ usuario: alumnoActual.matricula });
                } catch (usuarioError) {
                    console.error("Error eliminando usuario por matrícula:", usuarioError);
                }
            }

            // Eliminar alumno
            const resultado = await Alumno.findByIdAndDelete(alumnoId);
            if (!resultado) {
                return res.status(404).json({ error: "No se pudo eliminar el alumno" });
            }

            res.json({ mensaje: "Alumno eliminado correctamente" });
        } catch (error) {
            console.error("Error en DELETE /api/alumnos/:id:", error.message, error.stack);
            res.status(500).json({ error: "Error eliminando alumno", message: error.message, stack: error.stack });
        }
    });

    router.post("/api/alumnos/:id/reset-password", verificarSesion, verificarAdminPersonal, validarObjectId, async (req, res) => {
        try {
            const Alumno = mongoose.model("Alumno");
            const Usuario = mongoose.model("Usuario");

            const alumno = await Alumno.findById(req.params.id);
            if (!alumno) {
                return res.status(404).json({ error: "Alumno no encontrado" });
            }

            let usuario = null;
            if (alumno.usuarioId) {
                usuario = await Usuario.findById(alumno.usuarioId);
            }

            if (!usuario) {
                usuario = await Usuario.findOne({ usuario: alumno.matricula });
            }

            if (!usuario && alumno.correo) {
                usuario = await Usuario.findOne({ correo: alumno.correo });
            }

            if (!usuario) {
                return res.status(404).json({ error: "Usuario de alumno no encontrado" });
            }

            const contrasenaTemporal = generarPasswordTemporal();
            usuario.password = contrasenaTemporal;
            usuario.primerLogin = true;
            usuario.fechaRestablecimiento = new Date();
            await usuario.save();

            if (!alumno.usuarioId) {
                alumno.usuarioId = usuario._id;
                await alumno.save();
            }

            res.json({ 
                mensaje: "Contraseña temporal restablecida", 
                usuario: usuario.usuario, 
                contrasenaTemporal 
            });
        } catch (error) {
            console.error("Error restableciendo contraseña:", error);
            res.status(500).json({ error: "Error restableciendo contraseña: " + error.message });
        }
    });

    return router;
}

module.exports = crearRutasAlumnos;
