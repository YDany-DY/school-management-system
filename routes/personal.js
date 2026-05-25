const express = require("express");
const mongoose = require("mongoose");
const Personal = require("../models/Personal");
const { registrarActividad } = require("./actividades");

const router = express.Router();

const CARGOS_VALIDOS = [
    "administrador",
    "coordinador",
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
    instructor:"Instructor",
    auxiliar:"Auxiliar",
    capturista:"Capturista",
    maestro:"Instructor",
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

        delete item.password;
        delete item.permisos;

        return item;

    }

    async function validarCorreoNoAlumno(correo){

        const Alumno =
        mongoose.model("Alumno");

        const alumno =
        await Alumno.findOne({
            matricula:correo
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

            if(!req.body.nombre || !req.body.correo || !req.body.password){
                return res.status(400).json({
                    error:"Nombre, correo y contraseña son obligatorios"
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

            const existe =
            await Personal.findOne({
                usuario:req.body.correo
            });

            if(existe){
                return res.status(400).json({
                    error:"Ya existe personal con ese correo"
                });
            }

            const nuevoPersonal =
            new Personal({
                nombre:req.body.nombre,
                correo:req.body.correo,
                usuario:req.body.correo,
                password:req.body.password,
                cargo,
                rol:cargo === "administrador" ? "admin" : cargo === "instructor" ? "maestro" : "personal",
                activo:req.body.activo !== false
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
                mensaje:"Personal creado correctamente"
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
                usuario:req.body.correo,
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
                usuario:req.body.correo,
                cargo,
                rol:cargo === "administrador" ? "admin" : cargo === "instructor" ? "maestro" : "personal",
                activo:req.body.activo === true
            };

            if(req.body.password){
                datos.password = req.body.password;
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
