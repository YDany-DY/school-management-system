const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { migrarRolSiEsNecesario, verificarSesion } = require("../middleware/verificarRol");
const { registrarActividad } = require("./actividades");

const router = express.Router();

function dashboardPorRol(rol){

    const destinos = {
        admin:"/dashboard_admin",
        personal:"/dashboard_personal",
        maestro:"/dashboard_maestro",
        alumno:"/dashboard_alumno"
    };

    return destinos[rol] || "/";

}

router.post("/login", async (req, res) => {

    const {
    usuario,
    password
    } = req.body;

    try {

        const Usuario = mongoose.model("Usuario");

        const user = await Usuario.findOne({ usuario });

        if (!user) {
            return res.send("Usuario o contraseña incorrectos");
        }

        await migrarRolSiEsNecesario(user);

        let contraseñaValida = false;

        if (typeof user.password === "string" && user.password.startsWith("$2")) {
            contraseñaValida = await bcrypt.compare(password, user.password);
        } else {
            // Soporte para usuarios con password guardada en texto plano
            contraseñaValida = password === user.password;
            if (contraseñaValida) {
                user.password = await bcrypt.hash(password, 10);
                await user.save();
            }
        }

        if (!contraseñaValida) {
            return res.send("Usuario o contraseña incorrectos");
        }

        if (user.activo === false) {
            return res.send("Usuario inactivo");
        }

        req.session.usuario = {
            _id: user._id.toString(),
            nombre: user.nombre,
            correo: user.correo,
            usuario: user.usuario,
            rol: user.rol,
            permisos: user.permisos || [],
            primerLogin: user.primerLogin || false
        };

        await registrarActividad({
            usuario: user.usuario,
            rol: user.rol,
            accion: "login",
            modulo: "Seguridad",
            descripcion: `${user.usuario} inició sesión`
        });

        if (user.primerLogin) {
            return res.redirect("/cambiar-password");
        }

        res.redirect(dashboardPorRol(user.rol));

    } catch(error){

        console.log(error);

        res.send("Error en el servidor");

    }

});

router.get("/cambiar-password", verificarSesion, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/cambiar_password.html"));
});

router.post("/cambiar-password", verificarSesion, async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({ error: "Completa ambos campos" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Las contraseñas no coinciden" });
        }

        const Usuario = mongoose.model("Usuario");
        const user = await Usuario.findById(req.session.usuario._id);

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        user.password = await bcrypt.hash(password, 10);
        user.primerLogin = false;

        await user.save();

        req.session.usuario.primerLogin = false;

        await registrarActividad({
            usuario: user.usuario,
            rol: user.rol,
            accion: "cambiar contraseña",
            modulo: "Seguridad",
            descripcion: `${user.usuario} actualizó su contraseña`
        });

        res.json({
            mensaje: "Contraseña actualizada correctamente",
            redirect: dashboardPorRol(user.rol)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando contraseña" });
    }
});

router.get("/logout", async (req, res) => {

    const usuario =
    req.session.usuario;

    if(usuario){
        await registrarActividad({
            usuario:usuario.usuario,
            rol:usuario.rol,
            accion:"logout",
            modulo:"Seguridad",
            descripcion:`${usuario.usuario} cerró sesión`
        });
    }

    req.session.destroy(() => {
        res.redirect("/");
    });

});

module.exports = router;
