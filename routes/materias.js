const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

function crearRutasMaterias(verificarSesion, verificarRol) {
    const verificarAdminPersonal = verificarRol("admin", "personal", "maestro");

    router.get("/api/materias", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Materia = mongoose.model("Materia");
            const filtro = {};

            if (req.query.q) {
                const q = String(req.query.q).trim();
                filtro.$or = [
                    { nombre: new RegExp(q, "i") },
                    { clave: new RegExp(q, "i") },
                    { maestro: new RegExp(q, "i") }
                ];
            }

            if (req.query.activa !== undefined) {
                filtro.activa = req.query.activa === "true";
            }

            const materias = await Materia.find(filtro).sort({ nombre: 1 });
            res.json(materias);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo materias" });
        }
    });

    router.get("/api/materias/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const materia = await mongoose.model("Materia").findById(req.params.id);
            if (!materia) {
                return res.status(404).json({ error: "Materia no encontrada" });
            }
            res.json(materia);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo materia" });
        }
    });

    router.post("/api/materias", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Materia = mongoose.model("Materia");
            const nombre = String(req.body.nombre || "").trim();
            const clave = String(req.body.clave || "").trim();
            const semestre = Number(req.body.semestre);
            const creditos = Number(req.body.creditos);
            const maestro = String(req.body.maestro || "").trim();
            const activa = req.body.activa !== false;

            if (!nombre || !clave || !semestre || !creditos) {
                return res.status(400).json({ error: "Nombre, clave, semestre y créditos son obligatorios" });
            }

            const materiaExistente = await Materia.findOne({ clave });
            if (materiaExistente) {
                return res.status(400).json({ error: "Ya existe una materia con esa clave" });
            }

            const materia = await Materia.create({
                nombre,
                clave,
                semestre,
                creditos,
                maestro,
                activa,
                grupoIds: Array.isArray(req.body.grupoIds) ? req.body.grupoIds : []
            });

            res.status(201).json({ mensaje: "Materia creada correctamente", materia });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error creando materia" });
        }
    });

    router.put("/api/materias/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Materia = mongoose.model("Materia");
            const materia = await Materia.findById(req.params.id);
            if (!materia) {
                return res.status(404).json({ error: "Materia no encontrada" });
            }

            const nombre = String(req.body.nombre || "").trim();
            const clave = String(req.body.clave || "").trim();
            const semestre = Number(req.body.semestre);
            const creditos = Number(req.body.creditos);
            const maestro = String(req.body.maestro || "").trim();
            const activa = req.body.activa !== false;

            if (!nombre || !clave || !semestre || !creditos) {
                return res.status(400).json({ error: "Nombre, clave, semestre y créditos son obligatorios" });
            }

            const claveDuplicada = await Materia.findOne({ clave, _id: { $ne: materia._id } });
            if (claveDuplicada) {
                return res.status(400).json({ error: "Ya existe otra materia con esa clave" });
            }

            materia.nombre = nombre;
            materia.clave = clave;
            materia.semestre = semestre;
            materia.creditos = creditos;
            materia.maestro = maestro;
            materia.activa = activa;
            materia.grupoIds = Array.isArray(req.body.grupoIds) ? req.body.grupoIds : materia.grupoIds;

            await materia.save();
            res.json({ mensaje: "Materia actualizada correctamente" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error actualizando materia" });
        }
    });

    router.delete("/api/materias/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Materia = mongoose.model("Materia");
            const materia = await Materia.findById(req.params.id);
            if (!materia) {
                return res.status(404).json({ error: "Materia no encontrada" });
            }

            await Materia.findByIdAndDelete(materia._id);
            res.json({ mensaje: "Materia eliminada correctamente" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error eliminando materia" });
        }
    });

    return router;
}

module.exports = crearRutasMaterias;
