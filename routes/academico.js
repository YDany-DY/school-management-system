const express = require("express");
const mongoose = require("mongoose");
const { registrarActividad } = require("./actividades");

require("../models/Alumno");
require("../models/Materia");
require("../models/Grupo");
require("../models/Inscripcion");
require("../models/CriterioEvaluacion");
require("../models/Calificacion");
require("../models/Asistencia");

const router = express.Router();

function redondear(numero, decimales = 1){
    const factor = 10 ** decimales;
    return Math.round(Number(numero || 0) * factor) / factor;
}

function normalizarComponentes(componentes = []){
    return componentes
        .map(item => ({
            nombre:String(item.nombre || "").trim(),
            porcentaje:Number(item.porcentaje),
            calificacion:item.calificacion === undefined ? undefined : Number(item.calificacion)
        }))
        .filter(item => item.nombre && !Number.isNaN(item.porcentaje));
}

function validarPorcentajes(componentes){
    const total = componentes.reduce((suma, item) => suma + Number(item.porcentaje || 0), 0);
    return Math.round(total) === 100;
}

function calcularCalificacionFinal(componentes){
    if(!componentes.length || !validarPorcentajes(componentes)){
        return null;
    }

    const final = componentes.reduce((suma, item) => {
        return suma + ((Number(item.calificacion) || 0) * Number(item.porcentaje || 0) / 100);
    }, 0);

    return redondear(final, 2);
}

async function encontrarAlumnoDeSesion(sessionUser){
    const Alumno = mongoose.model("Alumno");

    return Alumno.findOne({
        $or:[
            { _id:sessionUser._id },
            { usuarioId:sessionUser._id },
            { matricula:sessionUser.usuario },
            { correo:sessionUser.correo }
        ]
    }).populate("grupoId", "nombre semestre carrera tutor");
}

function poblarCalificaciones(query){
    return query
        .populate("alumnoId", "nombre matricula carrera semestre grupoId")
        .populate("materiaId", "nombre clave semestre creditos")
        .populate("grupoId", "nombre semestre carrera tutor")
        .populate("criterioId", "nombre periodo componentes")
        .sort({ fecha:-1, createdAt:-1 });
}

function poblarAsistencias(query){
    return query
        .populate("alumnoId", "nombre matricula carrera semestre")
        .populate("materiaId", "nombre clave")
        .populate("grupoId", "nombre semestre carrera")
        .sort({ fecha:-1, createdAt:-1 });
}

function crearRutasAcademicas(verificarSesion, verificarRol){
    const verificarGestionAcademica = verificarRol("admin", "personal", "maestro");

    router.get("/evaluacion",
    verificarSesion,
    verificarGestionAcademica,
    (req, res) => {
        res.sendFile(require("path").join(__dirname, "../public/evaluacion.html"));
    });

    router.get("/api/academico/opciones",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Alumno = mongoose.model("Alumno");
            const Materia = mongoose.model("Materia");
            const Grupo = mongoose.model("Grupo");
            const CriterioEvaluacion = mongoose.model("CriterioEvaluacion");

            const [alumnos, materias, grupos, criterios] = await Promise.all([
                Alumno.find({ activo:{ $ne:false } }).select("nombre matricula carrera semestre grupoId").sort({ nombre:1 }),
                Materia.find({ activa:{ $ne:false } }).select("nombre clave semestre creditos").sort({ nombre:1 }),
                Grupo.find({ activo:{ $ne:false } }).select("nombre semestre carrera tutor").sort({ nombre:1 }),
                CriterioEvaluacion.find({ activo:{ $ne:false } })
                    .populate("materiaId", "nombre clave")
                    .populate("grupoId", "nombre")
                    .sort({ createdAt:-1 })
            ]);

            res.json({ alumnos, materias, grupos, criterios });
        } catch(error) {
            res.status(500).json({ error:"Error obteniendo opciones académicas" });
        }
    });

    router.get("/api/criterios",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const CriterioEvaluacion = mongoose.model("CriterioEvaluacion");
            const criterios = await CriterioEvaluacion.find()
                .populate("materiaId", "nombre clave")
                .populate("grupoId", "nombre semestre carrera")
                .sort({ createdAt:-1 });

            res.json(criterios);
        } catch(error) {
            res.status(500).json({ error:"Error obteniendo criterios" });
        }
    });

    router.post("/api/criterios",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const CriterioEvaluacion = mongoose.model("CriterioEvaluacion");
            const componentes = normalizarComponentes(req.body.componentes);

            if(!req.body.nombre || !req.body.periodo || !req.body.materiaId){
                return res.status(400).json({ error:"Nombre, periodo y materia son obligatorios" });
            }

            if(!validarPorcentajes(componentes)){
                return res.status(400).json({ error:"Los porcentajes deben sumar 100%" });
            }

            const criterio = await CriterioEvaluacion.create({
                nombre:req.body.nombre,
                materiaId:req.body.materiaId,
                grupoId:req.body.grupoId || null,
                periodo:req.body.periodo,
                componentes,
                activo:req.body.activo !== false
            });

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"crear",
                modulo:"Evaluación",
                descripcion:`Criterio creado: ${criterio.nombre}`
            });

            res.status(201).json({ mensaje:"Criterio creado correctamente", criterio });
        } catch(error) {
            res.status(500).json({ error:"Error creando criterio" });
        }
    });

    router.put("/api/criterios/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const CriterioEvaluacion = mongoose.model("CriterioEvaluacion");
            const componentes = normalizarComponentes(req.body.componentes);

            if(!req.body.nombre || !req.body.periodo || !req.body.materiaId){
                return res.status(400).json({ error:"Nombre, periodo y materia son obligatorios" });
            }

            if(!validarPorcentajes(componentes)){
                return res.status(400).json({ error:"Los porcentajes deben sumar 100%" });
            }

            await CriterioEvaluacion.findByIdAndUpdate(req.params.id, {
                nombre:req.body.nombre,
                materiaId:req.body.materiaId,
                grupoId:req.body.grupoId || null,
                periodo:req.body.periodo,
                componentes,
                activo:req.body.activo !== false
            });

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"editar",
                modulo:"Evaluación",
                descripcion:`Criterio actualizado: ${req.body.nombre}`
            });

            res.json({ mensaje:"Criterio actualizado correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error actualizando criterio" });
        }
    });

    router.delete("/api/criterios/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const CriterioEvaluacion = mongoose.model("CriterioEvaluacion");
            await CriterioEvaluacion.findByIdAndDelete(req.params.id);
            res.json({ mensaje:"Criterio eliminado correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error eliminando criterio" });
        }
    });

    router.get("/api/calificaciones",
    verificarSesion,
    async (req, res) => {
        try {
            const Calificacion = mongoose.model("Calificacion");
            const query = {};

            if(req.session.usuario.rol === "alumno"){
                const alumno = await encontrarAlumnoDeSesion(req.session.usuario);

                if(!alumno){
                    return res.status(404).json({ error:"No se encontró el alumno de la sesión" });
                }

                query.alumnoId = alumno._id;
            }

            const calificaciones = await poblarCalificaciones(Calificacion.find(query));
            res.json(calificaciones);
        } catch(error) {
            res.status(500).json({ error:"Error obteniendo calificaciones" });
        }
    });

    router.post("/api/calificaciones",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Calificacion = mongoose.model("Calificacion");
            const componentes = normalizarComponentes(req.body.componentes);

            if(!req.body.alumnoId || !req.body.materiaId || !req.body.periodo){
                return res.status(400).json({ error:"Alumno, materia y periodo son obligatorios" });
            }

            let calificacionFinal = Number(req.body.calificacion);

            if(componentes.length){
                if(componentes.some(item => Number.isNaN(item.calificacion))){
                    return res.status(400).json({ error:"Todas las calificaciones por criterio son obligatorias" });
                }

                calificacionFinal = calcularCalificacionFinal(componentes);

                if(calificacionFinal === null){
                    return res.status(400).json({ error:"Los porcentajes deben sumar 100%" });
                }
            }

            if(Number.isNaN(calificacionFinal) || calificacionFinal < 0 || calificacionFinal > 10){
                return res.status(400).json({ error:"La calificación final debe estar entre 0 y 10" });
            }

            const calificacion = await Calificacion.create({
                alumnoId:req.body.alumnoId,
                materiaId:req.body.materiaId,
                grupoId:req.body.grupoId || null,
                criterioId:req.body.criterioId || null,
                periodo:req.body.periodo,
                componentes,
                calificacion:calificacionFinal,
                fecha:req.body.fecha || new Date()
            });

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"registrar",
                modulo:"Calificaciones",
                descripcion:`Calificación registrada: ${redondear(calificacionFinal, 2)}`
            });

            res.status(201).json({ mensaje:"Calificación registrada correctamente", calificacion });
        } catch(error) {
            if(error.code === 11000){
                return res.status(400).json({ error:"Ya existe una calificación para ese alumno, materia y periodo" });
            }

            res.status(500).json({ error:"Error registrando calificación" });
        }
    });

    router.put("/api/calificaciones/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Calificacion = mongoose.model("Calificacion");
            const componentes = normalizarComponentes(req.body.componentes);

            if(!req.body.alumnoId || !req.body.materiaId || !req.body.periodo){
                return res.status(400).json({ error:"Alumno, materia y periodo son obligatorios" });
            }

            let calificacionFinal = Number(req.body.calificacion);

            if(componentes.length){
                calificacionFinal = calcularCalificacionFinal(componentes);

                if(calificacionFinal === null){
                    return res.status(400).json({ error:"Los porcentajes deben sumar 100%" });
                }
            }

            if(Number.isNaN(calificacionFinal) || calificacionFinal < 0 || calificacionFinal > 10){
                return res.status(400).json({ error:"La calificación final debe estar entre 0 y 10" });
            }

            await Calificacion.findByIdAndUpdate(req.params.id, {
                alumnoId:req.body.alumnoId,
                materiaId:req.body.materiaId,
                grupoId:req.body.grupoId || null,
                criterioId:req.body.criterioId || null,
                periodo:req.body.periodo,
                componentes,
                calificacion:calificacionFinal,
                fecha:req.body.fecha || new Date()
            });

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"editar",
                modulo:"Calificaciones",
                descripcion:`Calificación actualizada: ${redondear(calificacionFinal, 2)}`
            });

            res.json({ mensaje:"Calificación actualizada correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error actualizando calificación" });
        }
    });

    router.delete("/api/calificaciones/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Calificacion = mongoose.model("Calificacion");
            await Calificacion.findByIdAndDelete(req.params.id);
            res.json({ mensaje:"Calificación eliminada correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error eliminando calificación" });
        }
    });

    router.get("/api/asistencias",
    verificarSesion,
    async (req, res) => {
        try {
            const Asistencia = mongoose.model("Asistencia");
            const query = {};

            if(req.session.usuario.rol === "alumno"){
                const alumno = await encontrarAlumnoDeSesion(req.session.usuario);

                if(!alumno){
                    return res.status(404).json({ error:"No se encontró el alumno de la sesión" });
                }

                query.alumnoId = alumno._id;
            }

            const asistencias = await poblarAsistencias(Asistencia.find(query));
            res.json(asistencias);
        } catch(error) {
            res.status(500).json({ error:"Error obteniendo asistencias" });
        }
    });

    router.post("/api/asistencias",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Asistencia = mongoose.model("Asistencia");

            if(!req.body.alumnoId || !req.body.fecha || !req.body.estado){
                return res.status(400).json({ error:"Alumno, fecha y estado son obligatorios" });
            }

            if(!["presente", "falta", "retardo"].includes(req.body.estado)){
                return res.status(400).json({ error:"Estado de asistencia no válido" });
            }

            const asistencia = await Asistencia.create({
                alumnoId:req.body.alumnoId,
                materiaId:req.body.materiaId || null,
                grupoId:req.body.grupoId || null,
                fecha:req.body.fecha,
                estado:req.body.estado
            });

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"registrar",
                modulo:"Asistencias",
                descripcion:`Asistencia registrada: ${req.body.estado}`
            });

            res.status(201).json({ mensaje:"Asistencia registrada correctamente", asistencia });
        } catch(error) {
            res.status(500).json({ error:"Error registrando asistencia" });
        }
    });

    router.put("/api/asistencias/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Asistencia = mongoose.model("Asistencia");

            if(!req.body.alumnoId || !req.body.fecha || !req.body.estado){
                return res.status(400).json({ error:"Alumno, fecha y estado son obligatorios" });
            }

            await Asistencia.findByIdAndUpdate(req.params.id, {
                alumnoId:req.body.alumnoId,
                materiaId:req.body.materiaId || null,
                grupoId:req.body.grupoId || null,
                fecha:req.body.fecha,
                estado:req.body.estado
            });

            res.json({ mensaje:"Asistencia actualizada correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error actualizando asistencia" });
        }
    });

    router.delete("/api/asistencias/:id",
    verificarSesion,
    verificarGestionAcademica,
    async (req, res) => {
        try {
            const Asistencia = mongoose.model("Asistencia");
            await Asistencia.findByIdAndDelete(req.params.id);
            res.json({ mensaje:"Asistencia eliminada correctamente" });
        } catch(error) {
            res.status(500).json({ error:"Error eliminando asistencia" });
        }
    });

    router.get("/api/alumno/resumen",
    verificarSesion,
    async (req, res) => {
        try {
            const Inscripcion = mongoose.model("Inscripcion");
            const Calificacion = mongoose.model("Calificacion");
            const Asistencia = mongoose.model("Asistencia");
            const Alumno = mongoose.model("Alumno");
            let alumno = null;

            if(req.session.usuario.rol === "alumno"){
                alumno = await encontrarAlumnoDeSesion(req.session.usuario);
            } else {
                alumno = req.query.alumnoId
                    ? await Alumno.findById(req.query.alumnoId).populate("grupoId", "nombre semestre carrera tutor")
                    : await Alumno.findOne({ activo:{ $ne:false } }).populate("grupoId", "nombre semestre carrera tutor").sort({ nombre:1 });
            }

            if(!alumno){
                return res.status(404).json({ error:"No se encontró el alumno de la sesión" });
            }

            const [inscripciones, calificaciones, asistencias] = await Promise.all([
                Inscripcion.find({ alumnoId:alumno._id, estado:{ $ne:"archivada" } })
                    .populate("materiaId", "nombre clave semestre creditos")
                    .populate("grupoId", "nombre semestre carrera tutor activo")
                    .sort({ fechaInscripcion:-1 }),
                poblarCalificaciones(Calificacion.find({ alumnoId:alumno._id })),
                poblarAsistencias(Asistencia.find({ alumnoId:alumno._id }))
            ]);

            const promedio = calificaciones.length
                ? redondear(calificaciones.reduce((suma, item) => suma + Number(item.calificacion || 0), 0) / calificaciones.length, 2)
                : null;

            const asistenciasPonderadas = asistencias.reduce((suma, item) => {
                if(item.estado === "presente"){
                    return suma + 1;
                }

                if(item.estado === "retardo"){
                    return suma + 0.5;
                }

                return suma;
            }, 0);

            const porcentajeAsistencia = asistencias.length
                ? redondear((asistenciasPonderadas / asistencias.length) * 100)
                : null;

            const progresoAcademico = promedio === null && porcentajeAsistencia === null
                ? null
                : redondear(((promedio || 0) * 10 * 0.7) + ((porcentajeAsistencia || 0) * 0.3));

            res.json({
                alumno,
                grupo:alumno.grupoId || (inscripciones[0] && inscripciones[0].grupoId) || null,
                materias:inscripciones,
                calificaciones,
                asistencias,
                promedio,
                porcentajeAsistencia,
                progresoAcademico
            });
        } catch(error) {
            res.status(500).json({ error:"Error obteniendo resumen académico" });
        }
    });

    return router;
}

module.exports = crearRutasAcademicas;
