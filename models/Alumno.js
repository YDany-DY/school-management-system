const mongoose = require("mongoose");

const alumnoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        trim: true,
        default: ""
    },
    matricula: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    carrera: {
        type: String,
        required: true,
        trim: true
    },
    semestre: {
        type: Number,
        required: true,
        min: 1
    },
    grupoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grupo",
        default: null
    },
    usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
    },
    rol: {
        type: String,
        default: "alumno"
    },
    activo: {
        type: Boolean,
        default: true
    },
    estado: {
        type: String,
        enum: ["activo", "inactivo", "suspendido"],
        default: "activo"
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Alumno || mongoose.model("Alumno", alumnoSchema);
