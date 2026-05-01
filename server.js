const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Permitir recibir datos del formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpeta pública
app.use(express.static("public"));

// 🔗 Conexión a MongoDB
mongoose.connect("mongodb://localhost:27017/sistema_escolar")
.then(() => console.log("MongoDB conectado"))
.catch(err => console.log(err));

// 📦 Modelo Usuario
const Usuario = mongoose.model("Usuario", {
    usuario: String,
    password: String,
    rol: String
});

// 🔐 Ruta LOGIN REAL
app.post("/login", async (req, res) => {
    const { usuario, password } = req.body;

    const user = await Usuario.findOne({ usuario, password });

    if(user){
        if(user.rol === "administrador"){
            res.redirect("/dashboard_admin.html");
        } else {
            res.redirect("/dashboard_alumno.html");
        }
    } else {
        res.send("Usuario o contraseña incorrectos");
    }
});

// 🚀 Servidor
app.listen(3000, () => {
    console.log("Servidor en http://localhost:3000");
});