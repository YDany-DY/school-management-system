async function fetchJson(url, opciones = {}){
    const res = await fetch(url, { headers:{ "Content-Type":"application/json" }, ...opciones });
    const data = await res.json().catch(() => ({}));
    if(!res.ok){
        throw new Error(data.error || "Error en la petición");
    }
    return data;
}

function renderUltimos(lista, contenedorId, tipo){
    const contenedor = document.getElementById(contenedorId);
    if(!lista || !lista.length){
        contenedor.innerHTML = `<p class="empty-state">Sin ${tipo} recientes</p>`;
        return;
    }

    contenedor.innerHTML = lista.map(item => {
        const alumno = item.alumnoId || {};
        const materia = item.materiaId || {};
        const grupo = item.grupoId || {};
        const texto = tipo === "calificaciones"
            ? `${alumno.nombre || "Alumno"} · ${item.calificacion}`
            : `${alumno.nombre || "Alumno"} · ${item.estado}`;
        const detalle = tipo === "calificaciones"
            ? `${materia.nombre || "Materia"} · ${item.periodo}`
            : `${materia.nombre || "Materia"} · ${grupo.nombre || "Grupo"}`;
        return `
        <article class="activity-item">
            <div>
                <strong>${texto}</strong>
                <span>${detalle}</span>
            </div>
        </article>`;
    }).join("");
}

async function cargarDashboardMaestro(){
    const data = await fetchJson("/api/profesor/resumen");

    document.getElementById("bienvenidaMaestro").innerText = `Bienvenido ${data.nombre || "profesor"}`;
    document.getElementById("totalGrupos").innerText = data.totalGrupos || 0;
    document.getElementById("totalMaterias").innerText = data.totalMaterias || 0;
    document.getElementById("totalAlumnos").innerText = data.totalAlumnos || 0;
    renderUltimos(data.ultimasCalificaciones || [], "ultimasCalificaciones", "calificaciones");
    renderUltimos(data.ultimasAsistencias || [], "ultimasAsistencias", "asistencias");
}

cargarDashboardMaestro().catch(error => {
    const mensaje = document.getElementById("dashboardMensaje");
    if(mensaje){
        mensaje.textContent = error.message;
        mensaje.className = "form-feedback error";
    }
});
