const formPersonalizacion =
document.getElementById("formPersonalizacion");

const formPassword =
document.getElementById("formPassword");

const formUsuario =
document.getElementById("formUsuario");

const modalUsuario =
document.getElementById("modalUsuario");

const tablaUsuarios =
document.getElementById("tablaUsuarios");

const btnNuevoUsuario =
document.getElementById("btnNuevoUsuario");

const btnCancelarUsuario =
document.getElementById("btnCancelarUsuario");

const btnRespaldo =
document.getElementById("btnRespaldo");

let configuracionActual = {};

const cargosTexto = {
    administrador:"Administrador",
    admin:"Administrador",
    profesor:"Profesor",
    instructor:"Profesor",
    auxiliar:"Auxiliar",
    capturista:"Capturista",
    coordinador:"Coordinador",
    maestro:"Profesor",
    administrativo:"Auxiliar"
};

function mostrarMensaje(id, texto, tipo){

    const mensaje =
    document.getElementById(id);

    mensaje.textContent =
    texto;

    mensaje.className =
    `form-message ${tipo}`;

}

function datosFormulario(form){

    return Object.fromEntries(
    new FormData(form)
    );

}

function aplicarColorPrincipal(color){

    document.documentElement.style.setProperty(
    "--primary-color",
    color || "#2563eb"
    );

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

async function cargarConfiguracion(){

    try {

        const res =
        await fetch("/api/configuracion");

        const config =
        await res.json();

        configuracionActual =
        config;

        formPersonalizacion.nombreSistema.value =
        config.nombreSistema || "";

        formPersonalizacion.nombreInstitucion.value =
        config.nombreInstitucion || config.nombreEscuela || "";

        formPersonalizacion.textoBienvenida.value =
        config.textoBienvenida || "";

        formPersonalizacion.correoInstitucional.value =
        config.correoInstitucional || "";

        formPersonalizacion.telefono.value =
        config.telefono || "";

        formPersonalizacion.tipoSistema.value =
        config.tipoSistema || "Escolar";

        formPersonalizacion.colorPrincipal.value =
        config.colorPrincipal || "#2563eb";

        formPersonalizacion.logoSistema.value =
        config.logoSistema || "";

        aplicarColorPrincipal(config.colorPrincipal);

    } catch(error){

        mostrarMensaje(
        "mensajePersonalizacion",
        "No se pudo cargar la configuración",
        "error"
        );

    }

}

async function cargarUsuarios(){

    try {

        const res =
        await fetch("/api/personal");

        const usuarios =
        await res.json();

        tablaUsuarios.innerHTML = "";

        usuarios.forEach(usuario => {

            tablaUsuarios.innerHTML += `
            <tr>
                <td>${usuario.nombre || usuario.usuario || "Sin nombre"}</td>
                <td>${usuario.correo || usuario.usuario || "Sin correo"}</td>
                <td>${cargosTexto[usuario.cargo || usuario.rol] || usuario.cargoTexto || usuario.rol}</td>
                <td>${estadoBadge(usuario.activo !== false)}</td>
                <td>
                    <button
                    class="edit-btn"
                    onclick="editarUsuario(
                    '${usuario._id}',
                    '${usuario.nombre || ""}',
                    '${usuario.correo || usuario.usuario || ""}',
                    '${usuario.cargo || usuario.rol}',
                    ${usuario.activo !== false}
                    )">
                    Editar
                    </button>

                    <button
                    class="delete-btn"
                    onclick="eliminarUsuario('${usuario._id}')">
                    Eliminar
                    </button>
                </td>
            </tr>`;

        });

    } catch(error){

        mostrarMensaje(
        "mensajeUsuarios",
        "No se pudo cargar el personal",
        "error"
        );

    }

}

function abrirModalUsuario(){

    formUsuario.reset();

    formUsuario.id.value = "";

    formUsuario.activo.checked =
    true;

    document.getElementById("tituloModalUsuario").textContent =
    "Nuevo personal";

    modalUsuario.style.display =
    "flex";

}

function cerrarModalUsuario(){

    modalUsuario.style.display =
    "none";

}

function editarUsuario(id, nombre, correo, cargo, activo){

    formUsuario.id.value =
    id;

    formUsuario.nombre.value =
    nombre;

    formUsuario.correo.value =
    correo;

    formUsuario.password.value =
    "";

    formUsuario.cargo.value =
    cargo === "admin" ? "administrador" : cargo === "maestro" || cargo === "instructor" ? "profesor" : cargo === "administrativo" ? "auxiliar" : cargo;

    formUsuario.activo.checked =
    activo;

    document.getElementById("tituloModalUsuario").textContent =
    "Editar personal";

    modalUsuario.style.display =
    "flex";

}

async function eliminarUsuario(id){

    if(!confirm("¿Eliminar personal?")){
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
        "mensajeUsuarios",
        respuesta.mensaje,
        "success"
        );

        cargarUsuarios();

    } catch(error){

        mostrarMensaje(
        "mensajeUsuarios",
        error.message,
        "error"
        );

    }

}

formPersonalizacion.addEventListener("submit", async e => {

    e.preventDefault();

    const datos =
    datosFormulario(formPersonalizacion);

    if(!datos.nombreSistema || !datos.nombreInstitucion){
        mostrarMensaje(
        "mensajePersonalizacion",
        "Nombre del sistema e institución son obligatorios",
        "error"
        );
        return;
    }

    try {

        const res =
        await fetch("/api/configuracion", {
            method:"PUT",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                ...configuracionActual,
                ...datos,
                modoOscuro:true
            })
        });

        const respuesta =
        await res.json();

        if(!res.ok){
            throw new Error(respuesta.error);
        }

        configuracionActual = {
            ...configuracionActual,
            ...datos
        };

        aplicarColorPrincipal(datos.colorPrincipal);

        mostrarMensaje(
        "mensajePersonalizacion",
        respuesta.mensaje,
        "success"
        );

    } catch(error){

        mostrarMensaje(
        "mensajePersonalizacion",
        error.message,
        "error"
        );

    }

});

formUsuario.addEventListener("submit", async e => {

    e.preventDefault();

    const datos =
    datosFormulario(formUsuario);

    datos.activo =
    formUsuario.activo.checked;

    if(!datos.nombre || !datos.correo){
        mostrarMensaje(
        "mensajeUsuarios",
        "Nombre y correo son obligatorios",
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

        cerrarModalUsuario();

        const credenciales =
        !editando && respuesta.contrasenaTemporal
        ? `${respuesta.mensaje}. Usuario: ${respuesta.usuario}. Contraseña temporal: ${respuesta.contrasenaTemporal}`
        : respuesta.mensaje;

        mostrarMensaje(
        "mensajeUsuarios",
        credenciales,
        "success"
        );

        cargarUsuarios();

    } catch(error){

        mostrarMensaje(
        "mensajeUsuarios",
        error.message,
        "error"
        );

    }

});

formPassword.addEventListener("submit", async e => {

    e.preventDefault();

    const datos =
    datosFormulario(formPassword);

    if(datos.nuevaPassword.length < 6){
        mostrarMensaje(
        "mensajePassword",
        "La nueva contraseña debe tener al menos 6 caracteres",
        "error"
        );
        return;
    }

    if(datos.nuevaPassword !== datos.confirmarPassword){
        mostrarMensaje(
        "mensajePassword",
        "Las contraseñas no coinciden",
        "error"
        );
        return;
    }

    try {

        const res =
        await fetch("/api/configuracion/password", {
            method:"PUT",
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

        formPassword.reset();

        mostrarMensaje(
        "mensajePassword",
        respuesta.mensaje,
        "success"
        );

    } catch(error){

        mostrarMensaje(
        "mensajePassword",
        error.message,
        "error"
        );

    }

});

btnRespaldo.addEventListener("click", async () => {

    try {

        const res =
        await fetch("/api/configuracion/respaldo", {
            method:"POST"
        });

        const respuesta =
        await res.json();

        if(!res.ok){
            throw new Error(respuesta.error);
        }

        mostrarMensaje(
        "mensajeRespaldo",
        `${respuesta.mensaje}. Colecciones: ${respuesta.colecciones.join(", ")}`,
        "success"
        );

    } catch(error){

        mostrarMensaje(
        "mensajeRespaldo",
        error.message,
        "error"
        );

    }

});

btnNuevoUsuario.addEventListener(
"click",
abrirModalUsuario
);

btnCancelarUsuario.addEventListener(
"click",
cerrarModalUsuario
);

cargarConfiguracion();
cargarUsuarios();
