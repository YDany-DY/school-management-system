const iconosModulo = {
    Alumnos:"fa-user-graduate",
    Grupos:"fa-users",
    Materias:"fa-book",
    Personal:"fa-id-badge",
    Configuración:"fa-gear",
    Evaluación:"fa-clipboard-check",
    Calificaciones:"fa-chart-line",
    Asistencias:"fa-user-check",
    Inscripciones:"fa-pencil",
    Seguridad:"fa-shield-halved",
    Sistema:"fa-server"
};

function formatearFecha(fecha){

    return new Date(fecha)
    .toLocaleString("es-MX", {
        dateStyle:"short",
        timeStyle:"short"
    });

}

async function cargarUsuario(){

    const res =
    await fetch("/usuario");

    const data =
    await res.json();

    document.getElementById("bienvenida").innerText =
    `Bienvenido ${data.usuario}`;

}

async function cargarResumen(){

    const res =
    await fetch("/api/dashboard/resumen");

    const data =
    await res.json();

    document.getElementById("totalAlumnos").innerText =
    data.alumnos || 0;

    document.getElementById("totalPersonal").innerText =
    data.personalActivo || 0;

    document.getElementById("totalMaterias").innerText =
    data.materias || 0;

    document.getElementById("totalGrupos").innerText =
    data.grupos || 0;

    document.getElementById("detalleAlumnos").innerText =
    `${data.alumnosSemana || 0} nuevos esta semana`;

    document.getElementById("detallePersonal").innerText =
    `${data.personalActivo || 0} activos`;

    document.getElementById("detalleMaterias").innerText =
    `${data.materiasDisponibles || 0} disponibles`;

    document.getElementById("detalleGrupos").innerText =
    `${data.gruposActivos || 0} activos`;

}

async function cargarActividades(){

    const contenedor =
    document.getElementById("listaActividades");

    const res =
    await fetch("/api/actividades?limite=8");

    const actividades =
    await res.json();

    if(!actividades.length){
        contenedor.innerHTML =
        `<p class="empty-state">Todavía no hay actividades registradas</p>`;
        return;
    }

    contenedor.innerHTML =
    actividades.map(actividad => {

        const icono =
        iconosModulo[actividad.modulo] || "fa-circle-info";

        return `
        <article class="activity-item">
            <div class="activity-icon">
                <i class="fa-solid ${icono}"></i>
            </div>
            <div>
                <strong>${actividad.descripcion}</strong>
                <span>${actividad.modulo} · ${formatearFecha(actividad.fecha)}</span>
            </div>
        </article>`;

    }).join("");

}

async function cargarEstado(){

    const res =
    await fetch("/api/dashboard/estado");

    const estado =
    await res.json();

    document.getElementById("estadoMongo").innerText =
    estado.mongoConectado ? "🟢 Conectado" : "🔴 Desconectado";

    document.getElementById("estadoSesion").innerText =
    estado.sesionActiva ? "🟢 Activa" : "🔴 Inactiva";

    document.getElementById("estadoFecha").innerText =
    formatearFecha(estado.fecha);

    document.getElementById("estadoTipo").innerText =
    estado.tipoSistema || "Escolar";

}

async function cargarAlertas(){

    const contenedor =
    document.getElementById("listaAlertas");

    const res =
    await fetch("/api/dashboard/alertas");

    const alertas =
    await res.json();

    if(!alertas.length){
        contenedor.innerHTML =
        `<p class="empty-state">Sin alertas por ahora</p>`;
        return;
    }

    contenedor.innerHTML =
    alertas.map(alerta => `
        <article class="alert-item ${alerta.tipo}">
            <i class="fa-solid ${alerta.icono}"></i>
            <span>${alerta.texto}</span>
        </article>
    `).join("");

}

async function iniciarDashboard(){

    try {

        await Promise.all([
            cargarUsuario(),
            cargarResumen(),
            cargarActividades(),
            cargarEstado(),
            cargarAlertas()
        ]);

    } catch(error){

        console.error("Error cargando dashboard", error);

    }

}

iniciarDashboard();
