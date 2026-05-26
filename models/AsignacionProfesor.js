const mongoose = require("mongoose");

const asignacionProfesorSchema = new mongoose.Schema({
    profesorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Maestro",
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
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

asignacionProfesorSchema.index({ profesorId: 1, materiaId: 1, grupoId: 1 }, { unique: true });

module.exports = mongoose.models.AsignacionProfesor || mongoose.model("AsignacionProfesor", asignacionProfesorSchema);
