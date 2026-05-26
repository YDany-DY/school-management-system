const mongoose = require("mongoose");

const componenteSchema = new mongoose.Schema({
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
    }
}, {
    _id: false
});

const criterioEvaluacionSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
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
    periodo: {
        type: String,
        required: true,
        trim: true
    },
    componentes: {
        type: [componenteSchema],
        required: true,
        validate: {
            validator(componentes) {
                const total = componentes.reduce((suma, item) => suma + Number(item.porcentaje || 0), 0);
                return componentes.length > 0 && Math.round(total) === 100;
            },
            message: "Los porcentajes deben sumar 100%"
        }
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.CriterioEvaluacion || mongoose.model("CriterioEvaluacion", criterioEvaluacionSchema);
