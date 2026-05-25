async function obtenerDatosInscripcion() {
    const respuesta = await fetch("/api/inscripciones/seleccionables", {
        headers: { "Accept": "application/json" }
    });

    if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los datos de inscripciones");
    }

    return await respuesta.json();
}

async function obtenerInscripciones() {
    const respuesta = await fetch("/api/inscripciones", {
        headers: { "Accept": "application/json" }
    });

    if (!respuesta.ok) {
        throw new Error("No se pudieron cargar las inscripciones");
    }

    return await respuesta.json();
}

function mostrarMensaje(texto, tipo = "success") {
    const mensaje = document.getElementById("inscripcionMensaje");
    mensaje.innerText = texto;
    mensaje.className = `form-feedback ${tipo}`;
}

function limpiarMensaje() {
    const mensaje = document.getElementById("inscripcionMensaje");
    mensaje.innerText = "";
    mensaje.className = "form-feedback";
}

function llenarSelectes({ alumnos, materias, grupos }) {
    const alumnoSelect = document.getElementById("alumnoSelect");
    const materiaSelect = document.getElementById("materiaSelect");
    const grupoSelect = document.getElementById("grupoSelect");

    alumnos.forEach(alumno => {
        const opcion = document.createElement("option");
        opcion.value = alumno._id;
        opcion.innerText = `${alumno.nombre} · ${alumno.matricula}`;
        alumnoSelect.appendChild(opcion);
    });

    materias.forEach(materia => {
        const opcion = document.createElement("option");
        opcion.value = materia._id;
        opcion.innerText = `${materia.nombre} · ${materia.clave || "sin clave"}`;
        materiaSelect.appendChild(opcion);
    });

    grupos.forEach(grupo => {
        const opcion = document.createElement("option");
        opcion.value = grupo._id;
        opcion.innerText = `${grupo.nombre} · ${grupo.semestre || "?"}° · ${grupo.carrera || "General"}`;
        grupoSelect.appendChild(opcion);
    });
}

function mostrarInscripciones(inscripciones) {
    const contenedor = document.getElementById("listaInscripciones");

    if (!inscripciones.length) {
        contenedor.innerHTML = `<p class="empty-state">Aún no hay inscripciones registradas.</p>`;
        return;
    }

    contenedor.innerHTML = inscripciones.map(inscripcion => {
        const alumno = inscripcion.alumnoId || {};
        const materia = inscripcion.materiaId || {};
        const grupo = inscripcion.grupoId || {};
        const estado = inscripcion.estado || "activa";

        return `
            <article class="activity-item">
                <div>
                    <strong>${alumno.nombre || "Alumno desconocido"}</strong>
                    <p>${alumno.matricula || ""} · ${materia.nombre || "Materia desconocida"}</p>
                    <p>Grupo: ${grupo.nombre || "N/A"} · ${grupo.carrera || "N/A"}</p>
                    <p class="small-text">Inscrito el ${new Date(inscripcion.fechaInscripcion).toLocaleDateString("es-MX")}</p>
                </div>
                <span class="badge ${estado === "activa" ? "badge-success" : "badge-warning"}">${estado}</span>
            </article>`;
    }).join("");
}

async function inicializarInscripciones() {
    try {
        const [datos, inscripciones] = await Promise.all([
            obtenerDatosInscripcion(),
            obtenerInscripciones()
        ]);

        llenarSelectes(datos);
        mostrarInscripciones(inscripciones);
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message, "error");
        document.getElementById("listaInscripciones").innerHTML = `<p class="empty-state">No se pudieron cargar las inscripciones.</p>`;
    }
}

async function enviarInscripcion(event) {
    event.preventDefault();
    limpiarMensaje();

    const alumnoId = document.getElementById("alumnoSelect").value;
    const materiaId = document.getElementById("materiaSelect").value;
    const grupoId = document.getElementById("grupoSelect").value;

    try {
        const respuesta = await fetch("/api/inscripciones", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ alumnoId, materiaId, grupoId })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "Error guardando inscripción");
        }

        mostrarMensaje("Inscripción registrada con éxito.");
        document.getElementById("inscripcionForm").reset();
        const inscripciones = await obtenerInscripciones();
        mostrarInscripciones(inscripciones);
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message, "error");
    }
}

document.getElementById("inscripcionForm").addEventListener("submit", enviarInscripcion);

inicializarInscripciones();
