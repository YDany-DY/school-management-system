const crypto = require("crypto");
const mongoose = require("mongoose");

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
}

function obtenerBaseUsuario(correo, nombre) {
    let base = "";

    if (correo) {
        base = String(correo).split("@")[0];
    }

    if (!base && nombre) {
        const palabras = String(nombre)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (palabras.length >= 2) {
            base = `${palabras[0]}.${palabras[palabras.length - 1]}`;
        } else {
            base = palabras[0] || "usuario";
        }
    }

    base = normalizarTexto(base);

    return base || "usuario";
}

async function generarUsuarioUnico(base, Modelo) {
    const Usuario = Modelo || mongoose.model("Usuario");
    let candidato = base;
    let contador = 1;

    while (await Usuario.exists({ usuario: candidato })) {
        candidato = `${base}${contador}`;
        contador += 1;
    }

    return candidato;
}

function generarPasswordTemporal() {
    return crypto.randomBytes(4).toString("hex");
}

module.exports = {
    obtenerBaseUsuario,
    generarUsuarioUnico,
    generarPasswordTemporal
};
