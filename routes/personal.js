const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Personal = require("../models/Personal");
const { registrarActividad } = require("./actividades");
const {
    obtenerBaseUsuario,
    generarUsuarioUnico,
    generarPasswordTemporal
} = require("../utils/userHelpers");

const router = express.Router();

const CARGOS_VALIDOS = [
    "administrador",
    "coordinador",
    "profesor",
    "instructor",
    "auxiliar",
    "capturista"
];

const ROLES_PERSONAL_COMPATIBLES = [
    "personal",
    "admin",
    ...CARGOS_VALIDOS,
    "maestro",
    "administrativo"
];

const cargoVisible = {
    administrador:"Administrador",
    admin:"Administrador",
    coordinador:"Coordinador",
    profesor:"Profesor",
    instructor:"Profesor",
    auxiliar:"Auxiliar",
    capturista:"Capturista",
    maestro:"Profesor",
    administrativo:"Auxiliar"
};

function crearRutasPersonal(verificarSesion, verificarAdmin){

    function normalizarCargo(cargo){

        return String(cargo || "")
        .toLowerCase();

    }

    function prepararPersonal(persona){

        const item =
        persona.toObject();

        const cargo =
        normalizarCargo(item.cargo || item.rol);

        item.cargo =
        CARGOS_VALIDOS.includes(cargo) ? cargo : normalizarCargo(item.rol);

        item.cargoTexto =
        cargoVisible[item.cargo] || "Personal";

        item.estado = item.estado || (item.activo === false ? "inactivo" : "activo");

        delete item.password;
        delete item.permisos;

        return item;

    }

    function rolPorCargo(cargo){
        if(cargo === "administrador"){
            return "admin";
        }

        if(cargo === "profesor" || cargo === "instructor"){
            return "maestro";
        }

        return "personal";
    }

    function permisosPorCargo(cargo){
        const permisos = {
            coordinador:["alumnos", "maestros", "materias", "grupos", "evaluacion"],
            capturista:["alumnos", "materias", "grupos", "evaluacion"],
            auxiliar:["alumnos", "grupos"],
            profesor:[],
            instructor:[]
        };

        return permisos[cargo] || [];
    }

    async function validarCorreoNoAlumno(correo){

        const Alumno =
        mongoose.model("Alumno");

        const alumno =
        await Alumno.findOne({
            $or:[
                { matricula:correo },
                { correo }
            ]
        });

        return !alumno;

    }

    router.get("/api/personal",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const personal =
            await Personal.find({
                rol:{
                    $in:ROLES_PERSONAL_COMPATIBLES
                }
            })
            .sort({ nombre:1, usuario:1 });

            res.json(
            personal.map(prepararPersonal)
            );

        } catch(error){

            res.status(500).json({
                error:"Error obteniendo personal"
            });

        }

    });

    router.post("/api/personal",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const cargo =
            normalizarCargo(req.body.cargo);

            if(!req.body.nombre || !req.body.correo){
                return res.status(400).json({
                    error:"Nombre y correo son obligatorios"
                });
            }

            if(!CARGOS_VALIDOS.includes(cargo)){
                return res.status(400).json({
                    error:"Cargo no válido para personal"
                });
            }

            const correoDisponible =
            await validarCorreoNoAlumno(req.body.correo);

            if(!correoDisponible){
                return res.status(400).json({
                    error:"Ese dato pertenece a un alumno y no puede usarse en Personal"
                });
            }

            const Usuario = mongoose.model("Usuario");

            const correoUsado = await Usuario.findOne({ correo:req.body.correo });

            if(correoUsado){
                return res.status(400).json({
                    error:"Ya existe personal con ese correo"
                });
            }

            const baseUsuario = obtenerBaseUsuario(req.body.correo, req.body.nombre);
            const usuarioGenerado = await generarUsuarioUnico(baseUsuario, Usuario);
            const passwordTemporal = req.body.password || generarPasswordTemporal();
            const estado = req.body.estado || "activo";

            const nuevoPersonal =
            new Personal({
                nombre:req.body.nombre,
                correo:req.body.correo,
                usuario:usuarioGenerado,
                password:passwordTemporal,
                cargo,
                rol:rolPorCargo(cargo),
                activo:estado === "activo",
                estado,
                primerLogin:true,
                fechaRestablecimiento:new Date(),
                permisos:permisosPorCargo(cargo)
            });

            await nuevoPersonal.save();

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"crear",
                modulo:"Personal",
                descripcion:`Personal agregado: ${req.body.nombre}`
            });

            res.json({
                mensaje:"Personal creado correctamente",
                usuario:usuarioGenerado,
                contrasenaTemporal:passwordTemporal
            });

        } catch(error){

            res.status(500).json({
                error:"Error creando personal"
            });

        }

    });

    router.put("/api/personal/:id",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const cargo =
            normalizarCargo(req.body.cargo);

            if(!req.body.nombre || !req.body.correo){
                return res.status(400).json({
                    error:"Nombre y correo son obligatorios"
                });
            }

            if(!CARGOS_VALIDOS.includes(cargo)){
                return res.status(400).json({
                    error:"Cargo no válido para personal"
                });
            }

            const personaActual =
            await Personal.findById(req.params.id);

            if(
            !personaActual ||
            !ROLES_PERSONAL_COMPATIBLES.includes(normalizarCargo(personaActual.rol))
            ){
                return res.status(403).json({
                    error:"Este registro no pertenece al módulo Personal"
                });
            }

            const correoDisponible =
            await validarCorreoNoAlumno(req.body.correo);

            if(!correoDisponible){
                return res.status(400).json({
                    error:"Ese dato pertenece a un alumno y no puede usarse en Personal"
                });
            }

            const duplicado =
            await Personal.findOne({
                correo:req.body.correo,
                _id:{
                    $ne:req.params.id
                }
            });

            if(duplicado){
                return res.status(400).json({
                    error:"Ya existe otro miembro del personal con ese correo"
                });
            }

            const datos = {
                nombre:req.body.nombre,
                correo:req.body.correo,
                cargo,
                rol:rolPorCargo(cargo),
                activo:req.body.estado === "activo",
                estado:req.body.estado || "activo",
                permisos:permisosPorCargo(cargo)
            };

            if(req.body.password){
                datos.password = await bcrypt.hash(req.body.password, 10);
                datos.primerLogin = true;
                datos.fechaRestablecimiento = new Date();
            }

            await Personal.findByIdAndUpdate(
                req.params.id,
                datos
            );

            res.json({
                mensaje:"Personal actualizado correctamente"
            });

        } catch(error){

            res.status(500).json({
                error:"Error actualizando personal"
            });

        }

    });

    router.get("/api/personal/:id",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {
            const persona = await Personal.findById(req.params.id);

            if(!persona){
                return res.status(404).json({ error:"Personal no encontrado" });
            }

            res.json({
                ...persona.toObject(),
                estado: persona.estado || (persona.activo === false ? "inactivo" : "activo")
            });

        } catch(error){
            res.status(500).json({ error:"Error obteniendo personal" });
        }

    });

    router.post("/api/personal/:id/reset-password",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {
            const persona = await Personal.findById(req.params.id);

            if(!persona){
                return res.status(404).json({ error:"Personal no encontrado" });
            }

            const contrasenaTemporal = generarPasswordTemporal();

            persona.password = await bcrypt.hash(contrasenaTemporal, 10);
            persona.primerLogin = true;
            persona.fechaRestablecimiento = new Date();

            await persona.save();

            await registrarActividad({
                usuario:req.session.usuario.usuario,
                rol:req.session.usuario.rol,
                accion:"reset password",
                modulo:"Personal",
                descripcion:`Contraseña restablecida para personal: ${persona.nombre}`
            });

            res.json({
                mensaje:"Contraseña temporal restablecida",
                usuario:persona.usuario,
                contrasenaTemporal
            });

        } catch(error){
            res.status(500).json({ error:"Error restableciendo contraseña" });
        }

    });

    router.delete("/api/personal/:id",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            if(String(req.session.usuario._id) === String(req.params.id)){
                return res.status(400).json({
                    error:"No puedes eliminar tu propio usuario"
                });
            }

            const personaActual =
            await Personal.findById(req.params.id);

            if(
            !personaActual ||
            !ROLES_PERSONAL_COMPATIBLES.includes(normalizarCargo(personaActual.rol))
            ){
                return res.status(403).json({
                    error:"Este registro no pertenece al módulo Personal"
                });
            }

            await Personal.findByIdAndDelete(req.params.id);

            res.json({
                mensaje:"Personal eliminado correctamente"
            });

        } catch(error){

            res.status(500).json({
                error:"Error eliminando personal"
            });

        }

    });

    return router;

}

module.exports = crearRutasPersonal;
