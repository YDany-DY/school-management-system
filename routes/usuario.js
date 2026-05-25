const express = require("express");
const mongoose = require("mongoose");
const { verificarSesion } = require("../middleware/verificarRol");

const router = express.Router();

router.get("/usuario", verificarSesion, async (req, res) => {
    const sessionUser = req.session.usuario;

    if (!sessionUser) {
        return res.status(401).json({
            error: "No autorizado"
        });
    }

    let matricula = "";
    let carrera = "";
    let semestre = "";

    if (sessionUser.rol === "alumno") {
        const Alumno = mongoose.model("Alumno");

        const alumno = await Alumno.findOne({
            $or: [
                { matricula: sessionUser.usuario },
                { correo: sessionUser.correo }
            ]
        }).select("matricula carrera semestre nombre correo");

        if (alumno) {
            matricula = alumno.matricula || "";
            carrera = alumno.carrera || "";
            semestre = alumno.semestre || "";
        }
    }

    res.json({
        nombre: sessionUser.nombre || "",
        correo: sessionUser.correo || "",
        rol: sessionUser.rol || "",
        usuario: sessionUser.usuario || "",
        permisos: sessionUser.permisos || [],
        matricula,
        carrera,
        semestre
    });
});

module.exports = router;
