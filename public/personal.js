const tablaPersonal = document.getElementById("tablaPersonal");
const formPersonal = document.getElementById("formPersonal");
const modalPersonal = document.getElementById("modalPersonal");
const btnNuevoPersonal = document.getElementById("btnNuevoPersonal");
const btnCancelarPersonal = document.getElementById("btnCancelarPersonal");

const cargosTexto = {
    administrador: "Administrador",
    admin: "Administrador",
    coordinador: "Coordinador",
    profesor: "Profesor",
    instructor: "Profesor",
    auxiliar: "Auxiliar",
    capturista: "Capturista",
    maestro: "Profesor",
    administrativo: "Auxiliar"
};

let personalCache = [];

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById("mensajePersonal");
    mensaje.textContent = texto;
    mensaje.className = `form-message ${tipo}`;
}

function estadoBadge(estado) {
    const activo = estado === "activo";
    const clase = activo ? "active-status" : "inactive-status";
    const texto = estado === "suspendido" ? "Suspendido" : activo ? "Activo" : "Inactivo";
    return `
    <span class="status-badge ${clase}">
        <i class="fa-solid fa-circle"></i>
        ${texto}
    </span>`;
}

function datosFormulario(form) {
    return Object.fromEntries(new FormData(form));
}

async function cargarPersonal() {
    try {
        const res = await fetch("/api/personal");
        const personal = await res.json();

        personalCache = personal;
        tablaPersonal.innerHTML = "";

        personal.forEach(persona => {
            const cargo = persona.cargo || persona.rol;
            const estado = persona.estado || (persona.activo !== false ? "activo" : "inactivo");

            tablaPersonal.innerHTML += `
            <tr>
                <td>${persona.nombre || persona.usuario || "Sin nombre"}</td>
                <td>${persona.correo || persona.usuario || "Sin correo"}</td>
                <td>${cargosTexto[cargo] || persona.cargoTexto || cargo}</td>
                <td>${estadoBadge(estado)}</td>
                <td>
                    <button class="view-btn" onclick="verPersonal('${persona._id}')">Ver</button>
                    <button class="reset-btn" onclick="resetearContrasenaPersonal('${persona._id}')">Reset</button>
                    <button class="edit-btn" onclick="editarPersonal('${persona._id}')">Editar</button>
                    <button class="toggle-btn" onclick="toggleEstadoPersonal('${persona._id}')">${estado === 'activo' ? 'Desactivar' : 'Activar'}</button>
                    <button class="delete-btn" onclick="eliminarPersonal('${persona._id}')">Eliminar</button>
                </td>
            </tr>`;
        });
    } catch (error) {
        mostrarMensaje("No se pudo cargar el personal", "error");
    }
}

function abrirModalPersonal() {
    formPersonal.reset();
    formPersonal.id.value = "";
    formPersonal.usuario.hidden = true;
    formPersonal.estado.value = "activo";
    document.getElementById("tituloModalPersonal").textContent = "Nuevo personal";
    modalPersonal.style.display = "flex";
}

function cerrarModalPersonal() {
    modalPersonal.style.display = "none";
}

function editarPersonal(id) {
    const persona = personalCache.find(item => item._id === id);
    if (!persona) {
        mostrarMensaje("Personal no encontrado", "error");
        return;
    }

    formPersonal.id.value = persona._id;
    formPersonal.nombre.value = persona.nombre || "";
    formPersonal.correo.value = persona.correo || "";
    formPersonal.password.value = "";
    formPersonal.cargo.value = persona.cargo || persona.rol || "administrador";
    formPersonal.estado.value = persona.estado || (persona.activo !== false ? "activo" : "inactivo");
    formPersonal.usuario.hidden = false;
    formPersonal.usuario.value = persona.usuario || "";

    document.getElementById("tituloModalPersonal").textContent = "Editar personal";
    modalPersonal.style.display = "flex";
}

function verPersonal(id) {
    const persona = personalCache.find(item => item._id === id);
    if (!persona) {
        mostrarMensaje("Personal no encontrado", "error");
        return;
    }

    const estado = persona.estado || (persona.activo !== false ? "activo" : "inactivo");
    alert(`Nombre: ${persona.nombre || "Sin nombre"}\nCorreo: ${persona.correo || "Sin correo"}\nUsuario: ${persona.usuario || "No disponible"}\nCargo: ${cargosTexto[persona.cargo || persona.rol] || persona.cargo || persona.rol}\nEstado: ${estado}`);
}

async function resetearContrasenaPersonal(id) {
    if (!confirm("¿Restablecer contraseña temporal para este miembro del personal?")) {
        return;
    }

    try {
        const res = await fetch(`/api/personal/${id}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const respuesta = await res.json();
        if (!res.ok) {
            throw new Error(respuesta.error);
        }

        mostrarMensaje(`Contraseña temporal restablecida. Usuario: ${respuesta.usuario}. Contraseña: ${respuesta.contrasenaTemporal}`, "success");
        cargarPersonal();
    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

async function toggleEstadoPersonal(id) {
    const persona = personalCache.find(item => item._id === id);
    if (!persona) {
        mostrarMensaje("Personal no encontrado", "error");
        return;
    }

    const nuevoEstado = persona.estado === "activo" ? "inactivo" : "activo";
    try {
        const res = await fetch(`/api/personal/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: persona.nombre,
                correo: persona.correo,
                cargo: persona.cargo || persona.rol,
                estado: nuevoEstado
            })
        });

        const respuesta = await res.json();
        if (!res.ok) {
            throw new Error(respuesta.error);
        }

        mostrarMensaje(respuesta.mensaje, "success");
        cargarPersonal();
    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

async function eliminarPersonal(id) {
    if (!confirm("¿Eliminar este miembro del personal?")) {
        return;
    }

    try {
        const res = await fetch(`/api/personal/${id}`, {
            method: "DELETE"
        });
        const respuesta = await res.json();
        if (!res.ok) {
            throw new Error(respuesta.error);
        }

        mostrarMensaje(respuesta.mensaje, "success");
        cargarPersonal();
    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
}

formPersonal.addEventListener("submit", async e => {
    e.preventDefault();

    const datos = datosFormulario(formPersonal);
    datos.estado = datos.estado || "activo";
    datos.activo = datos.estado === "activo";

    if (!datos.nombre || !datos.correo) {
        mostrarMensaje("Nombre y correo son obligatorios", "error");
        return;
    }

    try {
        const editando = Boolean(datos.id);
        const url = editando ? `/api/personal/${datos.id}` : "/api/personal";
        const res = await fetch(url, {
            method: editando ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        const respuesta = await res.json();
        if (!res.ok) {
            throw new Error(respuesta.error);
        }

        cerrarModalPersonal();

        const credenciales = !editando && respuesta.contrasenaTemporal
            ? `${respuesta.mensaje}. Usuario: ${respuesta.usuario}. Contraseña temporal: ${respuesta.contrasenaTemporal}`
            : respuesta.mensaje;

        mostrarMensaje(credenciales, "success");
        cargarPersonal();
    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
});

btnNuevoPersonal.addEventListener("click", abrirModalPersonal);
btnCancelarPersonal.addEventListener("click", cerrarModalPersonal);

cargarPersonal();
