const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
    obtenerBaseUsuario,
    generarUsuarioUnico,
    generarPasswordTemporal
} = require("../utils/userHelpers");

const router = express.Router();

const ROLES_VALIDOS = [
    "admin",
    "maestro",
    "personal"
];

function crearRutasUsuarios(verificarSesion, verificarAdmin){

    function normalizarRol(rol){

        return String(rol || "")
        .toLowerCase();

    }

    function esRolAutorizado(rol){

        return ROLES_VALIDOS.includes(
        normalizarRol(rol)
        );

    }

    router.get("/api/usuarios",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const Usuario =
            mongoose.model("Usuario");

            const usuarios =
            await Usuario.find({
                rol:{
                    $in:ROLES_VALIDOS
                }
            })
            .select("-password -permisos")
            .sort({ usuario:1 });

            res.json(usuarios);

        } catch(error){

            res.status(500).json({
                error:"Error obteniendo usuarios"
            });

        }

    });

    router.post("/api/usuarios",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const Usuario =
            mongoose.model("Usuario");

            const rol =
            normalizarRol(req.body.rol);

            if(!req.body.nombre || !req.body.correo || !req.body.password){
                return res.status(400).json({
                    error:"Nombre, correo y contraseña son obligatorios"
                });
            }

            if(!ROLES_VALIDOS.includes(rol)){
                return res.status(400).json({
                    error:"Rol no válido para personal autorizado"
                });
            }

            const existe =
            await Usuario.findOne({
                correo:req.body.correo
            });

            if(existe){
                return res.status(400).json({
                    error:"Ya existe un usuario con ese correo"
                });
            }

            const Alumno =
            mongoose.model("Alumno");

            const alumnoExistente =
            await Alumno.findOne({
                matricula:req.body.correo
            });

            if(alumnoExistente){
                return res.status(400).json({
                    error:"Ese dato pertenece a un alumno y no puede usarse como usuario de personal"
                });
            }

            const baseUsuario = obtenerBaseUsuario(req.body.correo, req.body.nombre);
            const usuarioGenerado = await generarUsuarioUnico(baseUsuario, Usuario);
            const passwordTemporal = req.body.password || generarPasswordTemporal();
            const estado = req.body.estado || "activo";

            const nuevoUsuario =
            new Usuario({
                nombre:req.body.nombre,
                correo:req.body.correo,
                usuario:usuarioGenerado,
                password:passwordTemporal,
                rol,
                activo:estado === "activo",
                estado,
                primerLogin:true,
                fechaRestablecimiento:new Date()
            });

            await nuevoUsuario.save();

            res.json({
                mensaje:"Usuario creado correctamente",
                usuario:usuarioGenerado,
                contrasenaTemporal:passwordTemporal
            });

        } catch(error){

            res.status(500).json({
                error:"Error creando usuario"
            });

        }

    });

    router.put("/api/usuarios/:id",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            const Usuario =
            mongoose.model("Usuario");

            const rol =
            normalizarRol(req.body.rol);

            if(!req.body.nombre || !req.body.correo){
                return res.status(400).json({
                    error:"Nombre y correo son obligatorios"
                });
            }

            if(!ROLES_VALIDOS.includes(rol)){
                return res.status(400).json({
                    error:"Rol no válido para personal autorizado"
                });
            }

            const usuarioActual =
            await Usuario.findById(req.params.id);

            if(!usuarioActual || !esRolAutorizado(usuarioActual.rol)){
                return res.status(403).json({
                    error:"Este registro no pertenece al módulo de personal autorizado"
                });
            }

            const usuarioDuplicado =
            await Usuario.findOne({
                usuario:req.body.correo,
                _id:{
                    $ne:req.params.id
                }
            });

            if(usuarioDuplicado){
                return res.status(400).json({
                    error:"Ya existe otro usuario con ese correo"
                });
            }

            const Alumno =
            mongoose.model("Alumno");

            const alumnoExistente =
            await Alumno.findOne({
                matricula:req.body.correo
            });

            if(alumnoExistente){
                return res.status(400).json({
                    error:"Ese dato pertenece a un alumno y no puede usarse como usuario de personal"
                });
            }

            const datos = {
                nombre:req.body.nombre,
                correo:req.body.correo,
                usuario:req.body.correo,
                rol,
                activo:req.body.activo === true
            };

            if(req.body.password){
                datos.password = await bcrypt.hash(req.body.password, 10);
            }

            await Usuario.findByIdAndUpdate(
                req.params.id,
                datos
            );

            res.json({
                mensaje:"Usuario actualizado correctamente"
            });

        } catch(error){

            res.status(500).json({
                error:"Error actualizando usuario"
            });

        }

    });

    router.delete("/api/usuarios/:id",
    verificarSesion,
    verificarAdmin,
    async (req, res) => {

        try {

            if(String(req.session.usuario._id) === String(req.params.id)){
                return res.status(400).json({
                    error:"No puedes eliminar tu propio usuario"
                });
            }

            const Usuario =
            mongoose.model("Usuario");

            const usuarioActual =
            await Usuario.findById(req.params.id);

            if(!usuarioActual || !esRolAutorizado(usuarioActual.rol)){
                return res.status(403).json({
                    error:"Este registro no pertenece al módulo de personal autorizado"
                });
            }

            await Usuario.findByIdAndDelete(req.params.id);

            res.json({
                mensaje:"Usuario eliminado correctamente"
            });

        } catch(error){

            res.status(500).json({
                error:"Error eliminando usuario"
            });

        }

    });

    return router;

}

module.exports = crearRutasUsuarios;
