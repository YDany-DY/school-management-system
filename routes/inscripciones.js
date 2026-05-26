const express = require("express");
const mongoose = require("mongoose");
const { verificarSesion, verificarRol } = require("../middleware/verificarRol");
const { registrarActividad } = require("./actividades");

require("../models/Inscripcion");

const router = express.Router();

async function encontrarAlumnoActual(sessionUser) {
    const Alumno = mongoose.model("Alumno");

    return await Alumno.findOne({
        $or: [
            { correo: sessionUser.correo },
            { matricula: sessionUser.usuario }
        ]
    }).select("nombre correo matricula carrera semestre");
}

router.get("/api/inscripciones", verificarSesion, async (req, res) => {
    try {
        const Inscripcion = mongoose.model("Inscripcion");
        const query = {};

        if (req.session.usuario.rol === "alumno") {
            const alumno = await encontrarAlumnoActual(req.session.usuario);

            if (!alumno) {
                return res.status(404).json({
                    error: "No se encontró el alumno asociado a la sesión"
                });
            }

            query.alumnoId = alumno._id;
        }

        const inscripciones = await Inscripcion.find(query)
            .populate("alumnoId", "nombre matricula carrera semestre")
            .populate("materiaId", "nombre clave semestre creditos")
            .populate("grupoId", "nombre semestre carrera tutor activo")
            .sort({ fechaInscripcion: -1 });

        res.json(inscripciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error obteniendo inscripciones"
        });
    }
});

router.get("/api/inscripciones/seleccionables", verificarSesion, verificarRol("admin", "personal"), async (req, res) => {
    try {
        const Alumno = mongoose.model("Alumno");
        const Materia = mongoose.model("Materia");
        const Grupo = mongoose.model("Grupo");

        const [alumnos, materias, grupos] = await Promise.all([
            Alumno.find({}).select("nombre matricula carrera semestre").sort({ nombre: 1 }),
            Materia.find({}).select("nombre clave semestre creditos").sort({ nombre: 1 }),
            Grupo.find({}).select("nombre semestre carrera tutor activo").sort({ nombre: 1 })
        ]);

        res.json({ alumnos, materias, grupos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo datos para inscripciones" });
    }
});

router.post("/api/inscripciones", verificarSesion, verificarRol("admin", "personal"), async (req, res) => {
    try {
        const { alumnoId, materiaId, grupoId } = req.body;

        if (!alumnoId || !materiaId || !grupoId) {
            return res.status(400).json({
                error: "Alumno, materia y grupo son obligatorios"
            });
        }

        const Alumno = mongoose.model("Alumno");
        const Materia = mongoose.model("Materia");
        const Grupo = mongoose.model("Grupo");
        const Inscripcion = mongoose.model("Inscripcion");

        const [alumno, materia, grupo] = await Promise.all([
            Alumno.findById(alumnoId).select("nombre matricula"),
            Materia.findById(materiaId).select("nombre clave"),
            Grupo.findById(grupoId).select("nombre semestre carrera")
        ]);

        if (!alumno || !materia || !grupo) {
            return res.status(404).json({
                error: "Alumno, materia o grupo no existen"
            });
        }

        const inscripcionExistente = await Inscripcion.findOne({
            alumnoId,
            materiaId,
            grupoId,
            estado: { $ne: "archivada" }
        });

        if (inscripcionExistente) {
            return res.status(400).json({
                error: "Ya existe una inscripción activa para este alumno, materia y grupo"
            });
        }

        const nuevaInscripcion = new Inscripcion({
            alumnoId,
            materiaId,
            grupoId
        });

        await nuevaInscripcion.save();

        const inscripcionGuardada = await Inscripcion.findById(nuevaInscripcion._id)
            .populate("alumnoId", "nombre matricula carrera semestre")
            .populate("materiaId", "nombre clave semestre creditos")
            .populate("grupoId", "nombre semestre carrera tutor activo");

        await registrarActividad({
            usuario: req.session.usuario.usuario,
            rol: req.session.usuario.rol,
            accion: "crear",
            modulo: "Inscripciones",
            descripcion: `Inscripción registrada: ${alumno.nombre} en ${materia.nombre}`
        });

        res.status(201).json(inscripcionGuardada);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error creando la inscripción"
        });
    }
});

module.exports = router;
