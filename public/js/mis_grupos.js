async function fetchJson(url){
    const res = await fetch(url, { headers:{ "Content-Type":"application/json" } });
    const data = await res.json().catch(() => ({}));
    if(!res.ok){
        throw new Error(data.error || "Error al cargar los grupos");
    }
    return data;
}

function crearFilaGrupo(grupo){
    return `
        <tr>
            <td>${grupo.grupoNombre}</td>
            <td>${grupo.materiaNombre} ${grupo.materiaClave ? `(${grupo.materiaClave})` : ""}</td>
            <td>${grupo.numeroAlumnos}</td>
            <td>
                <button class="view-btn" onclick="verAlumnos('${grupo._id}')">Ver alumnos</button>
                <button class="save-btn" onclick="window.location.href='/evaluacion?grupoId=${grupo.grupoId}#asistencias'">Asistencia</button>
                <button class="edit-btn" onclick="window.location.href='/evaluacion?grupoId=${grupo.grupoId}#calificaciones'">Calificaciones</button>
            </td>
        </tr>`;
}

let estadoGrupos = [];

async function cargarGrupos(){
    const grupos = await fetchJson("/api/profesor/mis-grupos");
    estadoGrupos = grupos;
    const tbody = document.getElementById("tablaGrupos");
    if(!grupos.length){
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No tienes grupos asignados.</td></tr>`;
        return;
    }
    tbody.innerHTML = grupos.map(crearFilaGrupo).join("");
}

function verAlumnos(asignacionId){
    const grupo = estadoGrupos.find(item => item._id === asignacionId);
    if(!grupo){
        alert("Grupo no encontrado");
        return;
    }
    if(!grupo.alumnos.length){
        alert("No hay alumnos inscritos en este grupo.");
        return;
    }
    const detalles = grupo.alumnos.map(alumno => `${alumno.nombre} · ${alumno.matricula}`).join("\n");
    alert(`Alumnos de ${grupo.grupoNombre}:\n\n${detalles}`);
}

cargarGrupos().catch(error => {
    alert(error.message || "No se pudo cargar la información de grupos.");
});
