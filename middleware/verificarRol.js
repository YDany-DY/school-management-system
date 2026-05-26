const mongoose = require("mongoose");

function normalizarRolSistema(rol){

    const equivalencias = {
        administrador:"admin",
        administrativo:"personal",
        capturista:"personal",
        coordinador:"personal",
        auxiliar:"personal",
        instructor:"maestro",
        profesor:"maestro"
    };

    return equivalencias[rol] || rol;

}

async function migrarRolSiEsNecesario(usuario){

    const rolNormalizado =
    normalizarRolSistema(usuario.rol);

    if(usuario.rol !== rolNormalizado){
        usuario.rol = rolNormalizado;
        await usuario.save();
    }

    return usuario;

}

async function verificarSesion(req, res, next){

    if(!req.session.usuario){
        return res.redirect("/");
    }

    try {

        const Usuario =
        mongoose.model("Usuario");

        const usuarioActual =
        await Usuario.findById(req.session.usuario._id);

        if(!usuarioActual){
            req.session.destroy(() => {});
            return res.redirect("/");
        }

        if(usuarioActual.activo === false){
            return res.send("Usuario inactivo");
        }

        await migrarRolSiEsNecesario(usuarioActual);

        req.session.usuario = {
            _id: usuarioActual._id.toString(),
            nombre: usuarioActual.nombre,
            correo: usuarioActual.correo,
            usuario: usuarioActual.usuario,
            rol: usuarioActual.rol,
            permisos: usuarioActual.permisos || [],
            primerLogin: usuarioActual.primerLogin || false
        };

        next();

    } catch(error){

        res.status(500).send("Error verificando sesión");

    }

}

function verificarRol(...rolesPermitidos){

    return (req, res, next) => {

        if(!req.session.usuario){
            return res.redirect("/");
        }

        const rol =
        req.session.usuario.rol;

        if(rolesPermitidos.includes(rol)){
            return next();
        }

        return res.send("Acceso denegado");

    };

}

function verificarPermiso(modulo){

    return (req, res, next) => {

        if(!req.session.usuario){
            return res.redirect("/");
        }

        const usuario =
        req.session.usuario;

        if(usuario.rol === "admin"){
            return next();
        }

        if(
        usuario.rol === "personal" &&
        Array.isArray(usuario.permisos) &&
        usuario.permisos.includes(modulo)
        ){
            return next();
        }

        return res.send("Acceso denegado");

    };

}

module.exports = {
    normalizarRolSistema,
    migrarRolSiEsNecesario,
    verificarSesion,
    verificarRol,
    verificarPermiso
};
