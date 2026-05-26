function texto(valor, fallback = "No disponible"){
    if(valor === null || valor === undefined || valor === ""){
        return fallback;
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatoFecha(fecha){
    return new Date(fecha).toLocaleDateString("es-MX", {
        year:"numeric",
        month:"short",
        day:"numeric"
    });
}

async function obtenerResumenAlumno(){
    const respuesta = await fetch("/api/alumno/resumen", {
        headers: {
            "Accept": "application/json"
        }
    });

    const datos = await respuesta.json();

    if(!respuesta.ok){
        throw new Error(datos.error || "Error obteniendo resumen académico");
    }

    return datos;
}

function mostrarInformacionAlumno({ alumno, grupo }){
    document.getElementById("bienvenidaAlumno").innerText =
        `Hola, ${alumno.nombre || "alumno"}`;

    document.getElementById("alumnoNombre").innerText =
        alumno.nombre || "Sin nombre";

    document.getElementById("alumnoMatricula").innerText =
        alumno.matricula || "No disponible";

    document.getElementById("alumnoGrupo").innerText =
        grupo ? `${grupo.nombre} · ${grupo.carrera || "General"}` : "Sin grupo asignado";

    document.getElementById("alumnoCarrera").innerText =
        alumno.carrera || "No disponible";

    document.getElementById("alumnoSemestre").innerText =
        alumno.semestre ? `${alumno.semestre}° Semestre` : "No disponible";
}

function mostrarIndicadores(resumen){
    document.getElementById("promedioGeneral").innerText =
        resumen.promedio === null ? "--" : resumen.promedio;

    document.getElementById("materiasActivas").innerText =
        (resumen.materias || []).length;

    document.getElementById("asistenciaGeneral").innerText =
        resumen.porcentajeAsistencia === null ? "--" : `${resumen.porcentajeAsistencia}%`;

    document.getElementById("progresoAcademico").innerText =
        resumen.progresoAcademico === null ? "--" : `${resumen.progresoAcademico}%`;
}

function renderMaterias(materias){
    const lista = document.getElementById("materiasInscritasLista");

    if(!materias.length){
        lista.innerHTML = `<p class="empty-state">Sin materias inscritas.</p>`;
        return;
    }

    lista.innerHTML = materias.map(inscripcion => {
        const materia = inscripcion.materiaId || {};
        const grupo = inscripcion.grupoId || {};

        return `
            <div class="horario-item">
                <div>
                    <strong>${texto(materia.nombre, "Materia")}</strong>
                    <p>${texto(materia.clave, "Sin clave")}</p>
                    <p>Grupo: ${texto(grupo.nombre, "Sin grupo")}</p>
                </div>
                <span class="badge-success">${texto(inscripcion.estado || "activa")}</span>
            </div>`;
    }).join("");
}

function badgeCalificacion(valor){
    if(valor >= 9){
        return "badge-success";
    }

    if(valor >= 7){
        return "badge-warning";
    }

    return "badge-danger";
}

function renderCalificaciones(calificaciones){
    const lista = document.getElementById("calificacionesLista");

    if(!calificaciones.length){
        lista.innerHTML = `<p class="empty-state">Sin calificaciones registradas.</p>`;
        return;
    }

    lista.innerHTML = calificaciones.map(calificacion => {
        const materia = calificacion.materiaId || {};

        return `
            <div class="calificacion-item">
                <div>
                    <strong>${texto(materia.nombre, "Materia")}</strong>
                    <p>${texto(calificacion.periodo, "Periodo")} · ${formatoFecha(calificacion.fecha || calificacion.createdAt)}</p>
                </div>
                <span class="${badgeCalificacion(Number(calificacion.calificacion))}">
                    ${texto(calificacion.calificacion)}
                </span>
            </div>`;
    }).join("");
}

function renderDesglose(calificaciones){
    const lista = document.getElementById("evaluacionDesgloseLista");
    const conDesglose = calificaciones.filter(item => item.componentes && item.componentes.length);

    if(!conDesglose.length){
        lista.innerHTML = `<p class="empty-state">Sin desglose de evaluación registrado.</p>`;
        return;
    }

    lista.innerHTML = conDesglose.slice(0, 6).map(calificacion => {
        const materia = calificacion.materiaId || {};
        const detalles = calificacion.componentes.map(item => {
            return `${texto(item.nombre)} ${texto(item.porcentaje)}%: ${texto(item.calificacion)}`;
        }).join(" · ");

        return `
            <article class="activity-item">
                <div class="activity-icon">
                    <i class="fa-solid fa-scale-balanced"></i>
                </div>
                <div>
                    <strong>${texto(materia.nombre, "Materia")} · ${texto(calificacion.periodo, "Periodo")}</strong>
                    <span>${detalles}</span>
                </div>
            </article>`;
    }).join("");
}

function renderAsistencias(asistencias){
    const lista = document.getElementById("asistenciasLista");

    if(!asistencias.length){
        lista.innerHTML = `<p class="empty-state">Sin asistencias registradas.</p>`;
        return;
    }

    const iconos = {
        presente:"fa-circle-check",
        falta:"fa-circle-xmark",
        retardo:"fa-clock"
    };

    lista.innerHTML = asistencias.slice(0, 8).map(asistencia => {
        const materia = asistencia.materiaId || {};

        return `
            <article class="activity-item">
                <div class="activity-icon">
                    <i class="fa-solid ${iconos[asistencia.estado] || "fa-circle-info"}"></i>
                </div>
                <div>
                    <strong>${texto(asistencia.estado)}</strong>
                    <span>${texto(materia.nombre, "Sin materia")} · ${formatoFecha(asistencia.fecha)}</span>
                </div>
            </article>`;
    }).join("");
}

function renderActividad(resumen){
    const lista = document.getElementById("actividadAcademicaLista");
    const eventos = [
        ...(resumen.calificaciones || []).slice(0, 4).map(item => ({
            icono:"fa-chart-line",
            titulo:`Calificación ${item.calificacion}`,
            detalle:`${item.materiaId && item.materiaId.nombre ? item.materiaId.nombre : "Materia"} · ${item.periodo}`
        })),
        ...(resumen.asistencias || []).slice(0, 4).map(item => ({
            icono:"fa-user-check",
            titulo:`Asistencia: ${item.estado}`,
            detalle:item.materiaId && item.materiaId.nombre ? item.materiaId.nombre : "Sin materia"
        }))
    ];

    if(!eventos.length){
        lista.innerHTML = `<p class="empty-state">Sin actividad académica registrada.</p>`;
        return;
    }

    lista.innerHTML = eventos.slice(0, 6).map(evento => `
        <article class="activity-item">
            <div class="activity-icon">
                <i class="fa-solid ${evento.icono}"></i>
            </div>
            <div>
                <strong>${texto(evento.titulo)}</strong>
                <span>${texto(evento.detalle)}</span>
            </div>
        </article>
    `).join("");
}

function aplicarEstadoError(error){
    console.error("Error cargando datos de alumno:", error);

    document.getElementById("bienvenidaAlumno").innerText =
        "No se pudo cargar tu información";

    document.getElementById("subtituloAlumno").innerText =
        "Por favor, inicia sesión de nuevo.";

    document.getElementById("materiasInscritasLista").innerHTML =
        `<p class="empty-state">No se pudieron cargar las materias inscritas.</p>`;
}

async function iniciarAlumnoDashboard(){
    try {
        const resumen = await obtenerResumenAlumno();

        mostrarInformacionAlumno(resumen);
        mostrarIndicadores(resumen);
        renderMaterias(resumen.materias || []);
        renderCalificaciones(resumen.calificaciones || []);
        renderDesglose(resumen.calificaciones || []);
        renderAsistencias(resumen.asistencias || []);
        renderActividad(resumen);
    } catch(error) {
        aplicarEstadoError(error);
    }
}

iniciarAlumnoDashboard();
