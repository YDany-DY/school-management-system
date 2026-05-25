const tablaPersonal =
document.getElementById("tablaPersonal");

const formPersonal =
document.getElementById("formPersonal");

const modalPersonal =
document.getElementById("modalPersonal");

const btnNuevoPersonal =
document.getElementById("btnNuevoPersonal");

const btnCancelarPersonal =
document.getElementById("btnCancelarPersonal");

const cargosTexto = {
    administrador:"Administrador",
    admin:"Administrador",
    coordinador:"Coordinador",
    instructor:"Instructor",
    auxiliar:"Auxiliar",
    capturista:"Capturista",
    maestro:"Instructor",
    administrativo:"Auxiliar"
};

function mostrarMensaje(texto, tipo){

    const mensaje =
    document.getElementById("mensajePersonal");

    mensaje.textContent =
    texto;

    mensaje.className =
    `form-message ${tipo}`;

}

function estadoBadge(activo){

    const clase =
    activo ? "active-status" : "inactive-status";

    const texto =
    activo ? "Activo" : "Inactivo";

    return `
    <span class="status-badge ${clase}">
        <i class="fa-solid fa-circle"></i>
        ${texto}
    </span>`;

}

function datosFormulario(form){

    return Object.fromEntries(
    new FormData(form)
    );

}

async function cargarPersonal(){

    try {

        const res =
        await fetch("/api/personal");

        const personal =
        await res.json();

        tablaPersonal.innerHTML =
        "";

        personal.forEach(persona => {

            const cargo =
            persona.cargo || persona.rol;

            tablaPersonal.innerHTML += `
            <tr>
                <td>${persona.nombre || persona.usuario || "Sin nombre"}</td>
                <td>${persona.correo || persona.usuario || "Sin correo"}</td>
                <td>${cargosTexto[cargo] || persona.cargoTexto || cargo}</td>
                <td>${estadoBadge(persona.activo !== false)}</td>
                <td>
                    <button
                    class="edit-btn"
                    onclick="editarPersonal(
                    '${persona._id}',
                    '${persona.nombre || ""}',
                    '${persona.correo || persona.usuario || ""}',
                    '${cargo}',
                    ${persona.activo !== false}
                    )">
                    Editar
                    </button>

                    <button
                    class="delete-btn"
                    onclick="eliminarPersonal('${persona._id}')">
                    Eliminar
                    </button>
                </td>
            </tr>`;

        });

    } catch(error){

        mostrarMensaje(
        "No se pudo cargar el personal",
        "error"
        );

    }

}

function abrirModalPersonal(){

    formPersonal.reset();

    formPersonal.id.value =
    "";

    formPersonal.activo.checked =
    true;

    document.getElementById("tituloModalPersonal").textContent =
    "Nuevo personal";

    modalPersonal.style.display =
    "flex";

}

function cerrarModalPersonal(){

    modalPersonal.style.display =
    "none";

}

function editarPersonal(id, nombre, correo, cargo, activo){

    formPersonal.id.value =
    id;

    formPersonal.nombre.value =
    nombre;

    formPersonal.correo.value =
    correo;

    formPersonal.password.value =
    "";

    formPersonal.cargo.value =
    cargo === "admin" ? "administrador" : cargo === "maestro" ? "instructor" : cargo === "administrativo" ? "auxiliar" : cargo;

    formPersonal.activo.checked =
    activo;

    document.getElementById("tituloModalPersonal").textContent =
    "Editar personal";

    modalPersonal.style.display =
    "flex";

}

async function eliminarPersonal(id){

    if(!confirm("¿Eliminar este miembro del personal?")){
        return;
    }

    try {

        const res =
        await fetch(`/api/personal/${id}`, {
            method:"DELETE"
        });

        const respuesta =
        await res.json();

        if(!res.ok){
            throw new Error(respuesta.error);
        }

        mostrarMensaje(
        respuesta.mensaje,
        "success"
        );

        cargarPersonal();

    } catch(error){

        mostrarMensaje(
        error.message,
        "error"
        );

    }

}

formPersonal.addEventListener("submit", async e => {

    e.preventDefault();

    const datos =
    datosFormulario(formPersonal);

    datos.activo =
    formPersonal.activo.checked;

    if(!datos.nombre || !datos.correo){
        mostrarMensaje(
        "Nombre y correo son obligatorios",
        "error"
        );
        return;
    }

    if(!datos.id && !datos.password){
        mostrarMensaje(
        "La contraseña es obligatoria para personal nuevo",
        "error"
        );
        return;
    }

    try {

        const editando =
        Boolean(datos.id);

        const url =
        editando ? `/api/personal/${datos.id}` : "/api/personal";

        const res =
        await fetch(url, {
            method:editando ? "PUT" : "POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify(datos)
        });

        const respuesta =
        await res.json();

        if(!res.ok){
            throw new Error(respuesta.error);
        }

        cerrarModalPersonal();

        mostrarMensaje(
        respuesta.mensaje,
        "success"
        );

        cargarPersonal();

    } catch(error){

        mostrarMensaje(
        error.message,
        "error"
        );

    }

});

btnNuevoPersonal.addEventListener(
"click",
abrirModalPersonal
);

btnCancelarPersonal.addEventListener(
"click",
cerrarModalPersonal
);

cargarPersonal();
