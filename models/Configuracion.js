const mongoose = require("mongoose");

const configuracionSchema = new mongoose.Schema({

    nombreEscuela:{
        type:String,
        default:""
    },

    nombreSistema:{
        type:String,
        default:"Sistema Escolar"
    },

    nombreInstitucion:{
        type:String,
        default:""
    },

    textoBienvenida:{
        type:String,
        default:"Bienvenido al sistema escolar"
    },

    cicloEscolar:{
        type:String,
        default:""
    },

    correoInstitucional:{
        type:String,
        default:""
    },

    telefono:{
        type:String,
        default:""
    },

    modoOscuro:{
        type:Boolean,
        default:true
    },

    colorPrincipal:{
        type:String,
        default:"#2563eb"
    },

    logoSistema:{
        type:String,
        default:""
    },

    tipoSistema:{
        type:String,
        enum:["Escolar", "Cursos", "Capacitación"],
        default:"Escolar"
    }

}, {
    timestamps:true
});

module.exports = mongoose.model("Configuracion", configuracionSchema);
