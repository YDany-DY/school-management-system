const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

function crearRutasGrupos(verificarSesion, verificarRol) {
    const verificarAdminPersonal = verificarRol("admin", "personal", "maestro");

    router.get("/api/grupos", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const Alumno = mongoose.model("Alumno");

            const filtro = {};
            if (req.query.q) {
                const q = String(req.query.q).trim();
                filtro.$or = [
                    { nombre: new RegExp(q, "i") },
                    { carrera: new RegExp(q, "i") },
                    { tutor: new RegExp(q, "i") }
                ];
            }

            if (req.query.activo !== undefined) {
                filtro.activo = req.query.activo === "true";
            }

            const grupos = await Grupo.find(filtro).sort({ nombre: 1 });
            const respuestas = await Promise.all(grupos.map(async grupo => {
                const alumnosCount = await Alumno.countDocuments({ grupoId: grupo._id });
                return {
                    ...grupo.toObject(),
                    alumnosCount,
                    materiasCount: Array.isArray(grupo.materiaIds) ? grupo.materiaIds.length : 0
                };
            }));

            res.json(respuestas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo grupos" });
        }
    });

    router.get("/api/grupos/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const grupo = await Grupo.findById(req.params.id);
            if (!grupo) {
                return res.status(404).json({ error: "Grupo no encontrado" });
            }
            res.json(grupo);
        } catch (error) {
            res.status(500).json({ error: "Error obteniendo grupo" });
        }
    });

    router.post("/api/grupos", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const nombre = String(req.body.nombre || "").trim();
            const semestre = Number(req.body.semestre);
            const carrera = String(req.body.carrera || "").trim();
            const tutor = String(req.body.tutor || "").trim();
            const activo = req.body.activo !== false;
            const cupo = Number(req.body.cupo) || 30;

            if (!nombre || !semestre || !carrera) {
                return res.status(400).json({ error: "Nombre, semestre y carrera son obligatorios" });
            }

            const grupo = await Grupo.create({
                nombre,
                semestre,
                carrera,
                tutor,
                activo,
                cupo,
                ocupado: 0,
                materiaIds: Array.isArray(req.body.materiaIds) ? req.body.materiaIds : []
            });

            res.status(201).json({ mensaje: "Grupo creado correctamente", grupo });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error creando grupo" });
        }
    });

    router.put("/api/grupos/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const grupo = await Grupo.findById(req.params.id);
            if (!grupo) {
                return res.status(404).json({ error: "Grupo no encontrado" });
            }

            const nombre = String(req.body.nombre || "").trim();
            const semestre = Number(req.body.semestre);
            const carrera = String(req.body.carrera || "").trim();
            const tutor = String(req.body.tutor || "").trim();
            const activo = req.body.activo !== false;
            const cupo = Number(req.body.cupo) || grupo.cupo || 30;

            if (!nombre || !semestre || !carrera) {
                return res.status(400).json({ error: "Nombre, semestre y carrera son obligatorios" });
            }

            grupo.nombre = nombre;
            grupo.semestre = semestre;
            grupo.carrera = carrera;
            grupo.tutor = tutor;
            grupo.activo = activo;
            grupo.cupo = cupo;
            grupo.materiaIds = Array.isArray(req.body.materiaIds) ? req.body.materiaIds : grupo.materiaIds;

            await grupo.save();
            res.json({ mensaje: "Grupo actualizado correctamente" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error actualizando grupo" });
        }
    });

    router.delete("/api/grupos/:id", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const grupo = await Grupo.findById(req.params.id);
            if (!grupo) {
                return res.status(404).json({ error: "Grupo no encontrado" });
            }

            await Grupo.findByIdAndDelete(grupo._id);
            res.json({ mensaje: "Grupo eliminado correctamente" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error eliminando grupo" });
        }
    });

    return router;
}

module.exports = crearRutasGrupos;
