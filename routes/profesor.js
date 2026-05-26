const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const router = express.Router();

function crearRutasProfesor(verificarSesion, verificarRol){
    const verificarMaestroAdmin = verificarRol("admin", "maestro");
    const verificarAdmin = verificarRol("admin");

    function crearConsultaAsignaciones(maestro, asignaciones){
        const materiaIds = asignaciones.map(item => item.materiaId && item.materiaId._id ? item.materiaId._id : item.materiaId).filter(Boolean);
        const grupoIds = asignaciones.map(item => item.grupoId && item.grupoId._id ? item.grupoId._id : item.grupoId).filter(Boolean);
        return { materiaIds, grupoIds };
    }

    async function encontrarMaestroDeSesion(sessionUser){
        const Maestro = mongoose.model("Maestro");
        const maestro = await Maestro.findOne({ correo: sessionUser.correo })
            || await Maestro.findOne({ nombre: sessionUser.nombre });
        return maestro;
    }

    async function obtenerAsignacionesProfesor(req){
        const maestro = await encontrarMaestroDeSesion(req.session.usuario);
        if(!maestro){
            return { maestro: null, asignaciones: [], materiaIds: [], grupoIds: [] };
        }

        const AsignacionProfesor = mongoose.model("AsignacionProfesor");
        const Materia = mongoose.model("Materia");
        const Grupo = mongoose.model("Grupo");

        const asignaciones = await AsignacionProfesor.find({ profesorId: maestro._id, activo: true })
            .populate("materiaId", "nombre clave semestre creditos")
            .populate("grupoId", "nombre semestre carrera activo");

        let materiaIds = [];
        let grupoIds = [];

        if(asignaciones.length){
            materiaIds = asignaciones.map(item => item.materiaId && item.materiaId._id ? item.materiaId._id : item.materiaId).filter(Boolean);
            grupoIds = asignaciones.map(item => item.grupoId && item.grupoId._id ? item.grupoId._id : item.grupoId).filter(Boolean);
        } else {
            const materias = await Materia.find({ maestro: maestro.nombre, activa:{ $ne:false } });
            const grupos = await Grupo.find({ tutor: maestro.nombre, activo:{ $ne:false } });
            materiaIds = materias.map(item => item._id);
            grupoIds = grupos.map(item => item._id);
        }

        return { maestro, asignaciones, materiaIds, grupoIds };
    }

    router.get("/mis-grupos", verificarSesion, verificarMaestroAdmin, (req, res) => {
        res.sendFile(path.join(__dirname, "../public/mis_grupos.html"));
    });

    router.get("/mis-materias", verificarSesion, verificarMaestroAdmin, (req, res) => {
        res.sendFile(path.join(__dirname, "../public/mis_materias.html"));
    });

    router.get("/api/profesor/resumen", verificarSesion, verificarMaestroAdmin, async (req, res) => {
        try {
            const { maestro, asignaciones, materiaIds, grupoIds } = await obtenerAsignacionesProfesor(req);
            if(!maestro){
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const Alumno = mongoose.model("Alumno");
            const Calificacion = mongoose.model("Calificacion");
            const Asistencia = mongoose.model("Asistencia");

            const alumnos = grupoIds.length
                ? await Alumno.countDocuments({ grupoId: { $in: grupoIds }, activo:{ $ne:false } })
                : 0;

            const calificaciones = materiaIds.length || grupoIds.length
                ? await Calificacion.find({
                    $or: [
                        ...(materiaIds.length ? [{ materiaId: { $in: materiaIds } }] : []),
                        ...(grupoIds.length ? [{ grupoId: { $in: grupoIds } }] : [])
                    ]
                }).sort({ createdAt:-1 }).limit(5)
                .populate("alumnoId", "nombre matricula")
                .populate("materiaId", "nombre")
                .populate("grupoId", "nombre")
                .lean()
                : [];

            const asistencias = materiaIds.length || grupoIds.length
                ? await Asistencia.find({
                    $or: [
                        ...(materiaIds.length ? [{ materiaId: { $in: materiaIds } }] : []),
                        ...(grupoIds.length ? [{ grupoId: { $in: grupoIds } }] : [])
                    ]
                }).sort({ createdAt:-1 }).limit(5)
                .populate("alumnoId", "nombre matricula")
                .populate("materiaId", "nombre")
                .populate("grupoId", "nombre")
                .lean()
                : [];

            res.json({
                nombre: maestro.nombre,
                totalGrupos: grupoIds.length,
                totalMaterias: materiaIds.length,
                totalAlumnos: alumnos,
                ultimasCalificaciones: calificaciones,
                ultimasAsistencias: asistencias
            });
        } catch(error) {
            res.status(500).json({ error: "Error obteniendo resumen del profesor" });
        }
    });

    router.get("/api/profesor/mis-grupos", verificarSesion, verificarMaestroAdmin, async (req, res) => {
        try {
            const { maestro, asignaciones, grupoIds } = await obtenerAsignacionesProfesor(req);
            if(!maestro){
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const Alumno = mongoose.model("Alumno");
            const Grupo = mongoose.model("Grupo");

            if(asignaciones.length){
                const grupos = await Promise.all(asignaciones.map(async asignacion => {
                    const grupo = asignacion.grupoId;
                    const materia = asignacion.materiaId;
                    const alumnos = grupo && grupo._id
                        ? await Alumno.find({ grupoId: grupo._id, activo:{ $ne:false } }).select("nombre matricula")
                        : [];
                    return {
                        _id: asignacion._id,
                        grupoId: grupo ? grupo._id : null,
                        grupoNombre: grupo ? grupo.nombre : "Sin grupo",
                        materiaNombre: materia ? materia.nombre : "Sin materia",
                        materiaClave: materia ? materia.clave : "",
                        alumnos: alumnos.map(alumno => ({ _id: alumno._id, nombre: alumno.nombre, matricula: alumno.matricula })),
                        numeroAlumnos: alumnos.length
                    };
                }));

                return res.json(grupos);
            }

            const grupos = await Grupo.find({ _id: { $in: grupoIds }, activo:{ $ne:false } });
            const registros = await Promise.all(grupos.map(async grupo => {
                const alumnos = await Alumno.find({ grupoId: grupo._id, activo:{ $ne:false } }).select("nombre matricula");
                return {
                    _id: grupo._id,
                    grupoId: grupo._id,
                    grupoNombre: grupo.nombre,
                    materiaNombre: "Sin materia asignada",
                    materiaClave: "",
                    alumnos: alumnos.map(alumno => ({ _id: alumno._id, nombre: alumno.nombre, matricula: alumno.matricula })),
                    numeroAlumnos: alumnos.length
                };
            }));

            res.json(registros);
        } catch(error){
            res.status(500).json({ error: "Error obteniendo grupos del profesor" });
        }
    });

    router.get("/api/profesor/mis-materias", verificarSesion, verificarMaestroAdmin, async (req, res) => {
        try {
            const { maestro, asignaciones, materiaIds, grupoIds } = await obtenerAsignacionesProfesor(req);
            if(!maestro){
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const Grupo = mongoose.model("Grupo");
            const materiaMap = new Map();

            if(asignaciones.length){
                for(const asignacion of asignaciones){
                    const materia = asignacion.materiaId;
                    const grupo = asignacion.grupoId;
                    if(!materia) continue;
                    const key = materia._id.toString();
                    if(!materiaMap.has(key)){
                        materiaMap.set(key, {
                            _id: materia._id,
                            nombre: materia.nombre,
                            clave: materia.clave,
                            semestre: materia.semestre,
                            creditos: materia.creditos,
                            grupos: [],
                            alumnos: 0
                        });
                    }
                    const registro = materiaMap.get(key);
                    if(grupo){
                        registro.grupos.push({ _id: grupo._id, nombre: grupo.nombre });
                        const cantidad = await mongoose.model("Alumno").countDocuments({ grupoId: grupo._id, activo:{ $ne:false } });
                        registro.alumnos += cantidad;
                    }
                }

                return res.json(Array.from(materiaMap.values()));
            }

            const grupos = await Grupo.find({ _id: { $in: grupoIds }, activo:{ $ne:false } });
            const gruposData = grupos.map(grupo => ({ _id: grupo._id, nombre: grupo.nombre }));
            const totalAlumnos = await grupos.reduce(async (sumPromise, grupo) => {
                const sum = await sumPromise;
                const cantidad = await mongoose.model("Alumno").countDocuments({ grupoId: grupo._id, activo:{ $ne:false } });
                return sum + cantidad;
            }, Promise.resolve(0));

            const materias = await mongoose.model("Materia").find({ _id: { $in: materiaIds }, activa:{ $ne:false } });
            const materiasResult = materias.map(materia => ({
                _id: materia._id,
                nombre: materia.nombre,
                clave: materia.clave,
                semestre: materia.semestre,
                creditos: materia.creditos,
                grupos: gruposData,
                alumnos: totalAlumnos
            }));

            res.json(materiasResult);
        } catch(error){
            res.status(500).json({ error: "Error obteniendo materias del profesor" });
        }
    });

    router.get("/api/profesor/ultimos", verificarSesion, verificarMaestroAdmin, async (req, res) => {
        try {
            const { maestro, materiaIds, grupoIds } = await obtenerAsignacionesProfesor(req);
            if(!maestro){
                return res.status(404).json({ error: "Maestro no encontrado" });
            }

            const Calificacion = mongoose.model("Calificacion");
            const Asistencia = mongoose.model("Asistencia");

            const filter = {
                $or: [
                    ...(materiaIds.length ? [{ materiaId: { $in: materiaIds } }] : []),
                    ...(grupoIds.length ? [{ grupoId: { $in: grupoIds } }] : [])
                ]
            };

            const calificaciones = (materiaIds.length || grupoIds.length)
                ? await Calificacion.find(filter).sort({ createdAt:-1 }).limit(5)
                    .populate("alumnoId", "nombre matricula")
                    .populate("materiaId", "nombre")
                    .populate("grupoId", "nombre")
                : [];

            const asistencias = (materiaIds.length || grupoIds.length)
                ? await Asistencia.find(filter).sort({ createdAt:-1 }).limit(5)
                    .populate("alumnoId", "nombre matricula")
                    .populate("materiaId", "nombre")
                    .populate("grupoId", "nombre")
                : [];

            res.json({ ultimasCalificaciones: calificaciones, ultimasAsistencias: asistencias });
        } catch(error){
            res.status(500).json({ error: "Error obteniendo los últimos registros" });
        }
    });

    router.post("/api/profesor/asignaciones", verificarSesion, verificarAdmin, async (req, res) => {
        try {
            const { profesorId, materiaId, grupoId } = req.body;
            if(!profesorId || !materiaId || !grupoId){
                return res.status(400).json({ error: "Profesor, materia y grupo son obligatorios" });
            }

            const AsignacionProfesor = mongoose.model("AsignacionProfesor");
            const asignacion = await AsignacionProfesor.create({ profesorId, materiaId, grupoId, activo:true });
            res.status(201).json({ mensaje: "Asignación creada", asignacion });
        } catch(error){
            if(error.code === 11000){
                return res.status(400).json({ error: "Esta asignación ya existe" });
            }
            res.status(500).json({ error: "Error creando asignación" });
        }
    });

    return router;
}

module.exports = crearRutasProfesor;
