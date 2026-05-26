const mongoose = require("mongoose");

const asistenciaSchema = new mongoose.Schema({
    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Alumno",
        required: true
    },
    materiaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia",
        default: null
    },
    grupoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grupo",
        default: null
    },
    fecha: {
        type: Date,
        required: true,
        default: Date.now
    },
    estado: {
        type: String,
        enum: ["presente", "falta", "retardo"],
        required: true
    }
}, {
    timestamps: true
});

asistenciaSchema.index({ alumnoId: 1, materiaId: 1, grupoId: 1, fecha: 1 });

module.exports = mongoose.models.Asistencia || mongoose.model("Asistencia", asistenciaSchema);
