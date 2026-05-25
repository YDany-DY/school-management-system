const mongoose = require("mongoose");

const actividadSchema = new mongoose.Schema({

    usuario:{
        type:String,
        default:"Sistema"
    },

    rol:{
        type:String,
        default:"sistema"
    },

    accion:{
        type:String,
        required:true
    },

    modulo:{
        type:String,
        required:true
    },

    descripcion:{
        type:String,
        required:true
    },

    fecha:{
        type:Date,
        default:Date.now
    }

});

module.exports = mongoose.model("Actividad", actividadSchema);
