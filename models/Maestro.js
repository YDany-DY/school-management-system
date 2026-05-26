const mongoose = require("mongoose");

const maestroSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        trim: true
    },
    especialidad: {
        type: String,
        trim: true,
        default: ""
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

module.exports = mongoose.models.Maestro || mongoose.model("Maestro", maestroSchema);
