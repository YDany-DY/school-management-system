const mongoose = require("mongoose");

const materiaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    clave: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    semestre: {
        type: Number,
        required: true,
        min: 1
    },
    creditos: {
        type: Number,
        required: true,
        min: 1
    },
    maestro: {
        type: String,
        trim: true,
        default: ""
    },
    grupoIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grupo"
    }],
    activa: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Materia || mongoose.model("Materia", materiaSchema);
