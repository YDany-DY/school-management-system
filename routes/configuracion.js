const express = require("express");
const mongoose = require("mongoose");
const Configuracion = require("../models/Configuracion");
const { registrarActividad } = require("./actividades");

const router = express.Router();

function crearRutasConfiguracion(verificarSesion, verificarAdmin){

    async function obtenerConfiguracion(){

        let configuracion =
        await Configuracion.findOne();

        if(!configuracion){
            configuracion =
            await Configuracion.create({});
        }

        return configuracion;

    }

    router.get("/api/configuracion",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const configuracion =
            await obtenerConfiguracion();

            res.json(configuracion);

        } catch(error){

            res.status(500).json({
                error:"Error obteniendo configuración"
            });

        }

    });

    router.put("/api/configuracion",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const datos = {
                nombreSistema:req.body.nombreSistema,
                nombreInstitucion:req.body.nombreInstitucion,
                textoBienvenida:req.body.textoBienvenida,
                cicloEscolar:req.body.cicloEscolar,
                correoInstitucional:req.body.correoInstitucional,
                telefono:req.body.telefono,
                modoOscuro:req.body.modoOscuro === true,
                colorPrincipal:req.body.colorPrincipal || "#2563eb",
                logoSistema:req.body.logoSistema || "",
                tipoSistema:req.body.tipoSistema || "Escolar"
            };

            const configuracion =
            await obtenerConfiguracion();

            await Configuracion.findByIdAndUpdate(
                configuracion._id,
                datos
            );

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"editar",
                modulo:"Configuración",
                descripcion:"Configuración general actualizada"
            });

            res.json({
                mensaje:"Configuración guardada"
            });

        } catch(error){

            res.status(500).json({
                error:"Error guardando configuración"
            });

        }

    });

    router.put("/api/configuracion/password",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const Usuario =
            mongoose.model("Usuario");

            const {
            passwordActual,
            nuevaPassword,
            confirmarPassword
            } = req.body;

            if(!passwordActual || !nuevaPassword || !confirmarPassword){
                return res.status(400).json({
                    error:"Completa todos los campos"
                });
            }

            if(nuevaPassword.length < 6){
                return res.status(400).json({
                    error:"La nueva contraseña debe tener al menos 6 caracteres"
                });
            }

            if(nuevaPassword !== confirmarPassword){
                return res.status(400).json({
                    error:"Las contraseñas no coinciden"
                });
            }

            const admin =
            await Usuario.findById(req.session.usuario._id);

            if(!admin || admin.password !== passwordActual){
                return res.status(400).json({
                    error:"La contraseña actual es incorrecta"
                });
            }

            admin.password =
            nuevaPassword;

            await admin.save();

            res.json({
                mensaje:"Contraseña actualizada"
            });

        } catch(error){

            res.status(500).json({
                error:"Error actualizando contraseña"
            });

        }

    });

    router.post("/api/configuracion/respaldo",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const collections =
            await mongoose.connection.db
            .listCollections()
            .toArray();

            res.json({
                mensaje:"Respaldo generado correctamente",
                fecha:new Date(),
                colecciones:collections.map(collection => collection.name)
            });

        } catch(error){

            res.status(500).json({
                error:"Error generando respaldo"
            });

        }

    });

    return router;

}

module.exports = crearRutasConfiguracion;
