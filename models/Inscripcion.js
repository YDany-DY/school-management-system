const mongoose = require("mongoose");

const inscripcionSchema = new mongoose.Schema({
    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Alumno",
        required: true
    },
    materiaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia",
        required: true
    },
    grupoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grupo",
        required: true
    },
    estado: {
        type: String,
        default: "activa",
        enum: ["activa", "baja_materia", "baja_temporal", "archivada"]
    },
    fechaInscripcion: {
        type: Date,
        default: Date.now
    }
});

// Evita duplicar la misma inscripción de alumno, materia y grupo en el flujo normal.
inscripcionSchema.index({ alumnoId: 1, materiaId: 1, grupoId: 1 });

module.exports = mongoose.model("Inscripcion", inscripcionSchema);
