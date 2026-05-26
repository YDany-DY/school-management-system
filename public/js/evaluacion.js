const estado = {
    alumnos: [],
    materias: [],
    grupos: [],
    criterios: [],
    calificaciones: [],
    asistencias: []
};

let usuarioRol = null;

async function cargarUsuarioActual(){
    try {
        const respuesta = await fetch("/usuario", {
            headers: { "Content-Type": "application/json" }
        });
        if(!respuesta.ok){
            return null;
        }
        const usuario = await respuesta.json();
        usuarioRol = usuario.rol;
        return usuario;
    } catch(error){
        return null;
    }
}

function $(id){
    return document.getElementById(id);
}

function mostrarMensaje(texto, tipo = "success"){
    const mensaje = $("evaluacionMensaje");
    mensaje.textContent = texto;
    mensaje.className = `form-feedback ${tipo}`;
}

function option(value, texto){
    const opcion = document.createElement("option");
    opcion.value = value || "";
    opcion.textContent = texto;
    return opcion;
}

function llenarSelect(id, items, placeholder, render){
    const select = $(id);
    select.innerHTML = "";
    select.appendChild(option("", placeholder));

    items.forEach(item => {
        select.appendChild(option(item._id, render(item)));
    });
}

function fechaInput(fecha = new Date()){
    return new Date(fecha).toISOString().slice(0, 10);
}

function redondear(numero, decimales = 1){
    const factor = 10 ** decimales;
    return Math.round(Number(numero || 0) * factor) / factor;
}

async function pedirJson(url, opciones = {}){
    const respuesta = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        ...opciones
    });

    const datos = await respuesta.json().catch(() => ({}));

    if(!respuesta.ok){
        throw new Error(datos.error || "No se pudo completar la operación");
    }

    return datos;
}

async function cargarOpciones(){
    const datos = await pedirJson("/api/academico/opciones");

    estado.alumnos = datos.alumnos || [];
    estado.materias = datos.materias || [];
    estado.grupos = datos.grupos || [];
    estado.criterios = datos.criterios || [];

    const alumnoTexto = alumno => `${alumno.nombre} · ${alumno.matricula}`;
    const materiaTexto = materia => `${materia.nombre} · ${materia.clave}`;
    const grupoTexto = grupo => `${grupo.nombre} · ${grupo.carrera || "General"}`;
    const criterioTexto = criterio => {
        const materia = criterio.materiaId && criterio.materiaId.nombre ? criterio.materiaId.nombre : "Sin materia";
        return `${criterio.nombre} · ${criterio.periodo} · ${materia}`;
    };

    ["calificacionAlumno", "asistenciaAlumno"].forEach(id => llenarSelect(id, estado.alumnos, "Selecciona alumno", alumnoTexto));
    ["criterioMateria", "calificacionMateria", "asistenciaMateria"].forEach(id => llenarSelect(id, estado.materias, "Selecciona materia", materiaTexto));
    ["criterioGrupo", "calificacionGrupo", "asistenciaGrupo"].forEach(id => llenarSelect(id, estado.grupos, "Sin grupo específico", grupoTexto));
    llenarSelect("calificacionCriterio", estado.criterios, "Sin criterio", criterioTexto);
}

function componenteRow({ nombre = "", porcentaje = "", calificacion = "" } = {}, modo = "criterio"){
    const contenedor = document.createElement("div");
    contenedor.className = "component-row";

    const nombreInput = document.createElement("input");
    nombreInput.type = "text";
    nombreInput.placeholder = "Componente";
    nombreInput.value = nombre;
    nombreInput.className = "componente-nombre";
    nombreInput.disabled = modo === "calificacion";

    const porcentajeInput = document.createElement("input");
    porcentajeInput.type = "number";
    porcentajeInput.placeholder = "%";
    porcentajeInput.min = "0";
    porcentajeInput.max = "100";
    porcentajeInput.step = "1";
    porcentajeInput.value = porcentaje;
    porcentajeInput.className = "componente-porcentaje";
    porcentajeInput.disabled = modo === "calificacion";

    contenedor.appendChild(nombreInput);
    contenedor.appendChild(porcentajeInput);

    if(modo === "calificacion"){
        const calificacionInput = document.createElement("input");
        calificacionInput.type = "number";
        calificacionInput.placeholder = "0 - 10";
        calificacionInput.min = "0";
        calificacionInput.max = "10";
        calificacionInput.step = "0.1";
        calificacionInput.value = calificacion;
        calificacionInput.className = "componente-calificacion";
        calificacionInput.addEventListener("input", actualizarCalificacionFinal);
        contenedor.appendChild(calificacionInput);
    } else {
        const quitar = document.createElement("button");
        quitar.type = "button";
        quitar.className = "icon-action danger";
        quitar.innerHTML = '<i class="fa-solid fa-trash"></i>';
        quitar.addEventListener("click", () => {
            contenedor.remove();
            actualizarTotalCriterio();
        });
        contenedor.appendChild(quitar);

        nombreInput.addEventListener("input", actualizarTotalCriterio);
        porcentajeInput.addEventListener("input", actualizarTotalCriterio);
    }

    return contenedor;
}

function leerComponentes(contenedorId, conCalificacion = false){
    return Array.from($(contenedorId).querySelectorAll(".component-row")).map(row => {
        const componente = {
            nombre: row.querySelector(".componente-nombre").value.trim(),
            porcentaje: Number(row.querySelector(".componente-porcentaje").value || 0)
        };

        if(conCalificacion){
            componente.calificacion = Number(row.querySelector(".componente-calificacion").value);
        }

        return componente;
    }).filter(item => item.nombre);
}

function renderComponentesCriterio(componentes){
    const lista = $("criterioComponentes");
    lista.innerHTML = "";

    (componentes || [
        { nombre: "Examen", porcentaje: 40 },
        { nombre: "Tareas", porcentaje: 25 },
        { nombre: "Participación", porcentaje: 15 },
        { nombre: "Proyecto", porcentaje: 20 }
    ]).forEach(item => lista.appendChild(componenteRow(item, "criterio")));

    actualizarTotalCriterio();
}

function actualizarTotalCriterio(){
    const total = leerComponentes("criterioComponentes").reduce((suma, item) => suma + item.porcentaje, 0);
    $("criterioTotal").textContent = `${total}%`;
    $("criterioTotal").className = total === 100 ? "text-success" : "text-warning";
}

function aplicarCriterioCalificacion(){
    const criterio = estado.criterios.find(item => item._id === $("calificacionCriterio").value);
    const contenedor = $("calificacionComponentes");
    contenedor.innerHTML = "";

    if(!criterio){
        $("calificacionDirectaWrap").style.display = "flex";
        actualizarCalificacionFinal();
        return;
    }

    $("calificacionDirectaWrap").style.display = "none";
    $("calificacionMateria").value = criterio.materiaId && criterio.materiaId._id ? criterio.materiaId._id : criterio.materiaId || "";
    $("calificacionGrupo").value = criterio.grupoId && criterio.grupoId._id ? criterio.grupoId._id : criterio.grupoId || "";
    $("calificacionPeriodo").value = criterio.periodo || "";

    (criterio.componentes || []).forEach(item => {
        contenedor.appendChild(componenteRow(item, "calificacion"));
    });

    actualizarCalificacionFinal();
}

function actualizarCalificacionFinal(){
    const componentes = leerComponentes("calificacionComponentes", true);

    if(componentes.length){
        const final = componentes.reduce((suma, item) => suma + ((Number(item.calificacion) || 0) * Number(item.porcentaje || 0) / 100), 0);
        $("calificacionFinal").textContent = redondear(final, 2);
        return;
    }

    $("calificacionFinal").textContent = $("calificacionDirecta").value || "0";
}

function limpiarCriterio(){
    $("criterioId").value = "";
    $("criterioForm").reset();
    renderComponentesCriterio();
}

function limpiarCalificacion(){
    $("calificacionId").value = "";
    $("calificacionForm").reset();
    $("calificacionComponentes").innerHTML = "";
    $("calificacionDirectaWrap").style.display = "flex";
    $("calificacionFinal").textContent = "0";
}

function limpiarAsistencia(){
    $("asistenciaId").value = "";
    $("asistenciaForm").reset();
    $("asistenciaFecha").value = fechaInput();
}

async function guardarCriterio(event){
    event.preventDefault();

    const id = $("criterioId").value;
    const componentes = leerComponentes("criterioComponentes");
    const total = componentes.reduce((suma, item) => suma + item.porcentaje, 0);

    if(total !== 100){
        mostrarMensaje("Los porcentajes deben sumar 100%", "error");
        return;
    }

    const body = {
        nombre: $("criterioNombre").value,
        periodo: $("criterioPeriodo").value,
        materiaId: $("criterioMateria").value,
        grupoId: $("criterioGrupo").value || null,
        componentes,
        activo: true
    };

    const url = id ? `/api/criterios/${id}` : "/api/criterios";
    const metodo = id ? "PUT" : "POST";
    const respuesta = await pedirJson(url, {
        method: metodo,
        body: JSON.stringify(body)
    });

    mostrarMensaje(respuesta.mensaje);
    limpiarCriterio();
    await refrescarTodo();
}

async function guardarCalificacion(event){
    event.preventDefault();

    const id = $("calificacionId").value;
    const componentes = leerComponentes("calificacionComponentes", true);
    const body = {
        alumnoId: $("calificacionAlumno").value,
        materiaId: $("calificacionMateria").value,
        grupoId: $("calificacionGrupo").value || null,
        criterioId: $("calificacionCriterio").value || null,
        periodo: $("calificacionPeriodo").value,
        componentes,
        calificacion: componentes.length ? Number($("calificacionFinal").textContent) : Number($("calificacionDirecta").value)
    };

    const url = id ? `/api/calificaciones/${id}` : "/api/calificaciones";
    const metodo = id ? "PUT" : "POST";
    const respuesta = await pedirJson(url, {
        method: metodo,
        body: JSON.stringify(body)
    });

    mostrarMensaje(respuesta.mensaje);
    limpiarCalificacion();
    await refrescarTodo();
}

async function guardarAsistencia(event){
    event.preventDefault();

    const id = $("asistenciaId").value;
    const body = {
        alumnoId: $("asistenciaAlumno").value,
        materiaId: $("asistenciaMateria").value || null,
        grupoId: $("asistenciaGrupo").value || null,
        fecha: $("asistenciaFecha").value,
        estado: $("asistenciaEstado").value
    };

    const url = id ? `/api/asistencias/${id}` : "/api/asistencias";
    const metodo = id ? "PUT" : "POST";
    const respuesta = await pedirJson(url, {
        method: metodo,
        body: JSON.stringify(body)
    });

    mostrarMensaje(respuesta.mensaje);
    limpiarAsistencia();
    await refrescarTodo();
}

async function cargarRegistros(){
    const [criterios, calificaciones, asistencias] = await Promise.all([
        pedirJson("/api/criterios"),
        pedirJson("/api/calificaciones"),
        pedirJson("/api/asistencias")
    ]);

    estado.criterios = criterios;
    estado.calificaciones = calificaciones;
    estado.asistencias = asistencias;

    renderListas();
}

function renderListas(){
    const puedeGestionar = usuarioRol !== "maestro";

    $("listaCriterios").innerHTML = estado.criterios.length ? estado.criterios.slice(0, 8).map(criterio => {
        const materia = criterio.materiaId || {};
        const grupo = criterio.grupoId || {};
        return `
            <article class="activity-item">
                <div>
                    <strong>${criterio.nombre}</strong>
                    <span>${materia.nombre || "Materia"} · ${grupo.nombre || "Todos los grupos"} · ${criterio.periodo}</span>
                </div>
                ${puedeGestionar ? `
                <div class="record-actions">
                    <button class="icon-action" onclick="editarCriterio('${criterio._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-action danger" onclick="eliminarRegistro('/api/criterios/${criterio._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>` : ""}
            </article>`;
    }).join("") : '<p class="empty-state">Sin criterios registrados</p>';

    $("listaCalificaciones").innerHTML = estado.calificaciones.length ? estado.calificaciones.slice(0, 8).map(item => {
        const alumno = item.alumnoId || {};
        const materia = item.materiaId || {};
        return `
            <article class="activity-item">
                <div>
                    <strong>${alumno.nombre || "Alumno"} · ${item.calificacion}</strong>
                    <span>${materia.nombre || "Materia"} · ${item.periodo}</span>
                </div>
                ${puedeGestionar ? `
                <div class="record-actions">
                    <button class="icon-action" onclick="editarCalificacion('${item._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-action danger" onclick="eliminarRegistro('/api/calificaciones/${item._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>` : ""}
            </article>`;
    }).join("") : '<p class="empty-state">Sin calificaciones registradas</p>';

    $("listaAsistencias").innerHTML = estado.asistencias.length ? estado.asistencias.slice(0, 8).map(item => {
        const alumno = item.alumnoId || {};
        const materia = item.materiaId || {};
        return `
            <article class="activity-item">
                <div>
                    <strong>${alumno.nombre || "Alumno"} · ${item.estado}</strong>
                    <span>${materia.nombre || "Sin materia"} · ${fechaInput(item.fecha)}</span>
                </div>
                ${puedeGestionar ? `
                <div class="record-actions">
                    <button class="icon-action" onclick="editarAsistencia('${item._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-action danger" onclick="eliminarRegistro('/api/asistencias/${item._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>` : ""}
            </article>`;
    }).join("") : '<p class="empty-state">Sin asistencias registradas</p>';
}

window.editarCriterio = function(id){
    const criterio = estado.criterios.find(item => item._id === id);

    if(!criterio){
        return;
    }

    $("criterioId").value = criterio._id;
    $("criterioNombre").value = criterio.nombre || "";
    $("criterioPeriodo").value = criterio.periodo || "";
    $("criterioMateria").value = criterio.materiaId && criterio.materiaId._id ? criterio.materiaId._id : criterio.materiaId || "";
    $("criterioGrupo").value = criterio.grupoId && criterio.grupoId._id ? criterio.grupoId._id : criterio.grupoId || "";
    renderComponentesCriterio(criterio.componentes || []);
};

window.editarCalificacion = function(id){
    const item = estado.calificaciones.find(calificacion => calificacion._id === id);

    if(!item){
        return;
    }

    $("calificacionId").value = item._id;
    $("calificacionAlumno").value = item.alumnoId && item.alumnoId._id ? item.alumnoId._id : item.alumnoId || "";
    $("calificacionMateria").value = item.materiaId && item.materiaId._id ? item.materiaId._id : item.materiaId || "";
    $("calificacionGrupo").value = item.grupoId && item.grupoId._id ? item.grupoId._id : item.grupoId || "";
    $("calificacionCriterio").value = item.criterioId && item.criterioId._id ? item.criterioId._id : item.criterioId || "";
    $("calificacionPeriodo").value = item.periodo || "";

    const contenedor = $("calificacionComponentes");
    contenedor.innerHTML = "";

    if(item.componentes && item.componentes.length){
        $("calificacionDirectaWrap").style.display = "none";
        item.componentes.forEach(componente => contenedor.appendChild(componenteRow(componente, "calificacion")));
    } else {
        $("calificacionDirectaWrap").style.display = "flex";
        $("calificacionDirecta").value = item.calificacion || "";
    }

    actualizarCalificacionFinal();
};

window.editarAsistencia = function(id){
    const item = estado.asistencias.find(asistencia => asistencia._id === id);

    if(!item){
        return;
    }

    $("asistenciaId").value = item._id;
    $("asistenciaAlumno").value = item.alumnoId && item.alumnoId._id ? item.alumnoId._id : item.alumnoId || "";
    $("asistenciaMateria").value = item.materiaId && item.materiaId._id ? item.materiaId._id : item.materiaId || "";
    $("asistenciaGrupo").value = item.grupoId && item.grupoId._id ? item.grupoId._id : item.grupoId || "";
    $("asistenciaFecha").value = fechaInput(item.fecha);
    $("asistenciaEstado").value = item.estado || "presente";
};

window.eliminarRegistro = async function(url){
    if(!confirm("¿Eliminar este registro?")){
        return;
    }

    try {
        const respuesta = await pedirJson(url, { method:"DELETE" });
        mostrarMensaje(respuesta.mensaje);
        await refrescarTodo();
    } catch(error) {
        mostrarMensaje(error.message, "error");
    }
};

async function refrescarTodo(){
    await cargarOpciones();
    await cargarRegistros();
    llenarSelect("calificacionCriterio", estado.criterios, "Sin criterio", criterio => {
        const materia = criterio.materiaId && criterio.materiaId.nombre ? criterio.materiaId.nombre : "Sin materia";
        return `${criterio.nombre} · ${criterio.periodo} · ${materia}`;
    });
}

function aplicarFiltrosIniciales(){
    const params = new URLSearchParams(window.location.search);
    const grupoId = params.get("grupoId");
    const materiaId = params.get("materiaId");

    if(grupoId){
        $("calificacionGrupo").value = grupoId;
        $("asistenciaGrupo").value = grupoId;
    }

    if(materiaId){
        $("calificacionMateria").value = materiaId;
        $("asistenciaMateria").value = materiaId;
    }
}

async function iniciar(){
    try {
        renderComponentesCriterio();
        limpiarAsistencia();
        await cargarUsuarioActual();

        if(usuarioRol === "maestro"){
            const criteriosSection = document.getElementById("criteriosSection");
            if(criteriosSection){
                criteriosSection.style.display = "none";
            }
            const btnAgregar = document.getElementById("btnAgregarComponente");
            if(btnAgregar){
                btnAgregar.style.display = "none";
            }
        }

        await refrescarTodo();
        aplicarFiltrosIniciales();
    } catch(error) {
        mostrarMensaje(error.message, "error");
    }
}

$("btnAgregarComponente").addEventListener("click", () => {
    $("criterioComponentes").appendChild(componenteRow({}, "criterio"));
    actualizarTotalCriterio();
});
$("btnLimpiarCriterio").addEventListener("click", limpiarCriterio);
$("btnLimpiarCalificacion").addEventListener("click", limpiarCalificacion);
$("btnLimpiarAsistencia").addEventListener("click", limpiarAsistencia);
$("criterioForm").addEventListener("submit", event => guardarCriterio(event).catch(error => mostrarMensaje(error.message, "error")));
$("calificacionForm").addEventListener("submit", event => guardarCalificacion(event).catch(error => mostrarMensaje(error.message, "error")));
$("asistenciaForm").addEventListener("submit", event => guardarAsistencia(event).catch(error => mostrarMensaje(error.message, "error")));
$("calificacionCriterio").addEventListener("change", aplicarCriterioCalificacion);
$("calificacionDirecta").addEventListener("input", actualizarCalificacionFinal);

iniciar();
