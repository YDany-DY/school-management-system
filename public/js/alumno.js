async function obtenerUsuario() {
    const respuesta = await fetch("/usuario", {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!respuesta.ok) {
        throw new Error("No autorizado");
    }

    return await respuesta.json();
}

async function cargarMateriasInscritas() {
    const respuesta = await fetch("/api/inscripciones", {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!respuesta.ok) {
        throw new Error("Error obteniendo materias inscritas");
    }

    const inscripciones = await respuesta.json();
    const lista = document.getElementById("materiasInscritasLista");
    const materiasActivas = document.getElementById("materiasActivas");

    materiasActivas.innerText = inscripciones.length;

    if (!inscripciones.length) {
        lista.innerHTML = `<p class="empty-state">Aún no tienes materias inscritas.</p>`;
        return;
    }

    lista.innerHTML = inscripciones.map(inscripcion => {
        const materia = inscripcion.materiaId || {};
        const grupo = inscripcion.grupoId || {};
        const estado = inscripcion.estado || "activa";

        return `
            <div class="horario-item">
                <div>
                    <strong>${materia.nombre || "Materia desconocida"}</strong>
                    <p>${materia.clave ? `Clave ${materia.clave}` : "Sin clave"}</p>
                    <p>Grupo: ${grupo.nombre || "Sin grupo"}</p>
                    <p>${grupo.semestre ? `Semestre ${grupo.semestre}` : "Semestre no definido"}</p>
                </div>
                <span class="badge ${estado === "activa" ? "badge-success" : "badge-warning"}">
                    ${estado}
                </span>
            </div>`;
    }).join("");
}

function mostrarInformacionAlumno(usuario) {
    document.getElementById("bienvenidaAlumno").innerText =
        `Hola, ${usuario.nombre || "alumno"} 👋`;

    document.getElementById("alumnoNombre").innerText =
        usuario.nombre || "Sin nombre";

    document.getElementById("alumnoMatricula").innerText =
        usuario.matricula || "No disponible";

    document.getElementById("alumnoCarrera").innerText =
        usuario.carrera || "No disponible";

    document.getElementById("alumnoSemestre").innerText =
        usuario.semestre ? `${usuario.semestre}° Semestre` : "No disponible";
}

function aplicarEstadoError(error) {
    console.error("Error cargando datos de alumno:", error);
    document.getElementById("bienvenidaAlumno").innerText =
        "No se pudo cargar tu información";
    document.getElementById("subtituloAlumno").innerText =
        "Por favor, inicia sesión de nuevo.";
    document.getElementById("materiasInscritasLista").innerHTML =
        `<p class="empty-state">No se pudieron cargar las materias inscritas.</p>`;
}

async function iniciarAlumnoDashboard() {
    try {
        const usuario = await obtenerUsuario();

        mostrarInformacionAlumno(usuario);
        await cargarMateriasInscritas();

        // FUTURO: se puede ampliar con:
        // - Promedio parcial/final a partir de evaluaciones
        // - Asistencias por materia
        // - Horario y calendario
        // - Historial académico completo
    } catch (error) {
        aplicarEstadoError(error);
    }
}

iniciarAlumnoDashboard();
