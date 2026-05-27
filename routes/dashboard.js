const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

function crearRutasDashboard(verificarSesion, verificarRol) {
    const verificarAdminPersonal = verificarRol("admin", "personal");

    router.get("/api/dashboard/resumen", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Alumno = mongoose.model("Alumno");
            const Usuario = mongoose.model("Usuario");
            const Materia = mongoose.model("Materia");
            const Grupo = mongoose.model("Grupo");
            const Calificacion = mongoose.model("Calificacion");
            const Asistencia = mongoose.model("Asistencia");

            const [alumnos, personalActivo, materias, grupos, resumenCalificaciones, resumenAsistencias] = await Promise.all([
                Alumno.countDocuments({ activo: { $ne: false } }),
                Usuario.countDocuments({ rol: { $in: ["personal", "admin"] }, activo: { $ne: false } }),
                Materia.countDocuments({ activa: { $ne: false } }),
                Grupo.countDocuments({ activo: { $ne: false } }),
                Calificacion.aggregate([
                    { $match: {} },
                    { $group: { _id: null, promedioGeneral: { $avg: "$calificacion" } } }
                ]),
                Asistencia.aggregate([
                    { $match: {} },
                    { $group: { _id: null, total: { $sum: 1 }, presentes: { $sum: { $cond: [{ $eq: ["$estado", "presente"] }, 1, 0] }, retards: { $sum: { $cond: [{ $eq: ["$estado", "retardo"] }, 0.5, 0] } } } }
                ])
            ]);

            const alumnosSemana = await Alumno.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

            const promedioGeneral = resumenCalificaciones[0] ? Number(resumenCalificaciones[0].promedioGeneral.toFixed(2)) : 0;
            const asistenciaTotal = resumenAsistencias[0] ? (resumenAsistencias[0].presentes + resumenAsistencias[0].retards) : 0;
            const asistenciaPorcentaje = resumenAsistencias[0] && resumenAsistencias[0].total
                ? Number(((asistenciaTotal / resumenAsistencias[0].total) * 100).toFixed(2))
                : 0;

            const alumnosPorGrupo = await Alumno.aggregate([
                { $match: { grupoId: { $ne: null } } },
                { $group: { _id: "$grupoId", totalAlumnos: { $sum: 1 } } },
                { $lookup: { from: "grupos", localField: "_id", foreignField: "_id", as: "grupo" } },
                { $unwind: { path: "$grupo", preserveNullAndEmptyArrays: true } },
                { $project: { grupo: "$grupo.nombre", totalAlumnos: 1 } },
                { $sort: { totalAlumnos: -1 } }
            ]);

            const promedioPorMateria = await Calificacion.aggregate([
                { $group: { _id: "$materiaId", promedio: { $avg: "$calificacion" } } },
                { $lookup: { from: "materias", localField: "_id", foreignField: "_id", as: "materia" } },
                { $unwind: { path: "$materia", preserveNullAndEmptyArrays: true } },
                { $project: { nombre: "$materia.nombre", promedio: { $round: ["$promedio", 2] } } },
                { $sort: { promedio: -1 } }
            ]);

            res.json({
                alumnos,
                personalActivo,
                materias,
                grupos,
                alumnosSemana,
                promedioGeneral,
                asistenciaPorcentaje,
                alumnosPorGrupo,
                promedioPorMateria
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo resumen del dashboard" });
        }
    });

    router.get("/api/dashboard/estado", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Configuracion = mongoose.model("Configuracion");
            const config = await Configuracion.findOne().sort({ createdAt: -1 });
            res.json({
                mongoConectado: !!mongoose.connection.readyState,
                sesionActiva: !!req.session.usuario,
                fecha: new Date(),
                tipoSistema: config ? config.tipoSistema : "Escolar"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo estado del dashboard" });
        }
    });

    router.get("/api/dashboard/alertas", verificarSesion, verificarAdminPersonal, async (req, res) => {
        try {
            const Grupo = mongoose.model("Grupo");
            const gruposActivos = await Grupo.countDocuments({ activo: { $ne: false } });
            const alertas = [];
            if (gruposActivos < 3) {
                alertas.push({ tipo: "warning", icono: "fa-exclamation-triangle", texto: "Pocos grupos activos actualmente" });
            }
            if (!alertas.length) {
                alertas.push({ tipo: "success", icono: "fa-check-circle", texto: "El sistema funciona correctamente" });
            }
            res.json(alertas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error obteniendo alertas" });
        }
    });

    return router;
}

module.exports = crearRutasDashboard;
