async function fetchJson(url){
    const res = await fetch(url, { headers:{ "Content-Type":"application/json" } });
    const data = await res.json().catch(() => ({}));
    if(!res.ok){
        throw new Error(data.error || "Error al cargar las materias");
    }
    return data;
}

function crearFilaMateria(materia){
    const gruposTexto = materia.grupos.length
        ? materia.grupos.map(grupo => grupo.nombre).join(", ")
        : "--";
    return `
        <tr>
            <td>${materia.nombre}</td>
            <td>${materia.clave}</td>
            <td>${materia.semestre}</td>
            <td>${materia.creditos}</td>
            <td>${gruposTexto}</td>
            <td>${materia.alumnos || 0}</td>
        </tr>`;
}

async function cargarMaterias(){
    const materias = await fetchJson("/api/profesor/mis-materias");
    const tbody = document.getElementById("tablaMaterias");
    if(!materias.length){
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No tienes materias asignadas.</td></tr>`;
        return;
    }
    tbody.innerHTML = materias.map(crearFilaMateria).join("");
}

cargarMaterias().catch(error => {
    alert(error.message || "No se pudo cargar la información de materias.");
});
