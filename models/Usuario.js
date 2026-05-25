const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    rol: {
        type: String,
        required: true,
        enum: ["admin", "personal", "maestro", "alumno"]
    },
    primerLogin: {
        type: Boolean,
        default: true
    },
    activo: {
        type: Boolean,
        default: true
    },
    permisos: [String],
    nombre: String,
    correo: String
}, {
    collection: "usuarios"
});

module.exports = mongoose.model("Usuario", usuarioSchema);
