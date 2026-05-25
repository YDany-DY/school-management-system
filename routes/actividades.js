const express = require("express");
const Actividad = require("../models/Actividad");

const router = express.Router();

async function registrarActividad({
    usuario = "Sistema",
    rol = "sistema",
    accion,
    modulo,
    descripcion
}){

    if(!accion || !modulo || !descripcion){
        return;
    }

    try {

        await Actividad.create({
            usuario,
            rol,
            accion,
            modulo,
            descripcion
        });

    } catch(error){

        console.log("No se pudo registrar actividad:", error.message);

    }

}

function crearRutasActividades(verificarSesion, verificarAdmin){

    router.get("/api/actividades",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const limite =
            Math.min(Number(req.query.limite) || 8, 30);

            const actividades =
            await Actividad.find()
            .sort({ fecha:-1 })
            .limit(limite);

            res.json(actividades);

        } catch(error){

            res.status(500).json({
                error:"Error obteniendo actividades"
            });

        }

    });

    router.post("/api/actividades",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const {
            accion,
            modulo,
            descripcion
            } = req.body;

            if(!accion || !modulo || !descripcion){
                return res.status(400).json({
                    error:"Acción, módulo y descripción son obligatorios"
                });
            }

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion,
                modulo,
                descripcion
            });

            res.json({
                mensaje:"Actividad registrada"
            });

        } catch(error){

            res.status(500).json({
                error:"Error registrando actividad"
            });

        }

    });

    return router;

}

module.exports = {
    crearRutasActividades,
    registrarActividad
};
