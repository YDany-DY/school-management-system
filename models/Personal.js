const mongoose = require("mongoose");

// Personal usa la misma colección de usuarios del login.
// Así se reorganiza el módulo sin romper autenticación existente.
const personalSchema = new mongoose.Schema({

    nombre:String,
    correo:String,
    usuario:String,
    password:String,
    cargo:String,
    rol:String,
    activo:Boolean,
    permisos:[String]

}, {
    collection:"usuarios"
});

module.exports = mongoose.model("Personal", personalSchema);
