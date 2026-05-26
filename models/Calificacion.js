const mongoose = require("mongoose");

const detalleCalificacionSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    porcentaje: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    calificacion: {
        type: Number,
        required: true,
        min: 0,
        max: 10
    }
}, {
    _id: false
});

const calificacionSchema = new mongoose.Schema({
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
        default: null
    },
    criterioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CriterioEvaluacion",
        default: null
    },
    periodo: {
        type: String,
        required: true,
        trim: true
    },
    componentes: {
        type: [detalleCalificacionSchema],
        default: []
    },
    calificacion: {
        type: Number,
        required: true,
        min: 0,
        max: 10
    },
    fecha: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

calificacionSchema.index({ alumnoId: 1, materiaId: 1, periodo: 1 }, { unique: true });

module.exports = mongoose.models.Calificacion || mongoose.model("Calificacion", calificacionSchema);
