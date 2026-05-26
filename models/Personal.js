const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Personal usa la misma colección de usuarios del login.
// Así se reorganiza el módulo sin romper autenticación existente.
const personalSchema = new mongoose.Schema({

    nombre:String,
    correo:String,
    usuario:String,
    password:String,
    cargo:String,
    rol:String,
    activo:Boolean,
    estado:{
        type:String,
        enum:["activo","inactivo","suspendido"],
        default:"activo"
    },
    primerLogin:{
        type:Boolean,
        default:true
    },
    fechaRestablecimiento:Date,
    permisos:[String]

}, {
    collection:"usuarios"
});

personalSchema.pre("save", async function(){
    if(!this.isModified("password")){
        return;
    }

    if(typeof this.password === "string" && this.password.startsWith("$2")){
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.models.Personal || mongoose.model("Personal", personalSchema);
