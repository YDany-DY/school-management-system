const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
    estado: {
        type: String,
        enum: ["activo", "inactivo", "suspendido"],
        default: "activo"
    },
    fechaRestablecimiento: Date,
    permisos: [String],
    nombre: String,
    correo: String
}, {
    collection: "usuarios"
});

usuarioSchema.pre("save", async function(){
    if(!this.isModified("password")){
        return;
    }

    if(typeof this.password === "string" && this.password.startsWith("$2")){
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.models.Usuario || mongoose.model("Usuario", usuarioSchema);
