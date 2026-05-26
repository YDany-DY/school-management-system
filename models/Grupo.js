const mongoose = require("mongoose");

const grupoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    semestre: {
        type: Number,
        required: true,
        min: 1
    },
    carrera: {
        type: String,
        required: true,
        trim: true
    },
    tutor: {
        type: String,
        trim: true,
        default: ""
    },
    materiaIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia"
    }],
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Grupo || mongoose.model("Grupo", grupoSchema);
