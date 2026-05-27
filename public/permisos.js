async function aplicarPermisosSidebar(){
    const res = await fetch("/usuario");
    if(!res.ok){
        return;
    }

    const usuario = await res.json();
    const nav = document.querySelector("aside.sidebar nav");
    const rutaActual = window.location.pathname;

    function crearLink(href, icono, texto){
        const activo = rutaActual === href;
        return `
            <a href="${href}"${activo ? " class=\"active\"" : ""}>
                <i class="fa-solid ${icono}"></i>
                ${texto}
            </a>`;
    }

    if(usuario.rol === "maestro"){
        if(nav){
            nav.innerHTML = `
                ${crearLink("/dashboard_maestro", "fa-house", "Inicio")} 
                ${crearLink("/mis-grupos", "fa-users", "Mis grupos")} 
                ${crearLink("/mis-materias", "fa-book", "Mis materias")} 
                ${crearLink("/evaluacion#calificaciones", "fa-chart-line", "Calificaciones")} 
                ${crearLink("/evaluacion#asistencias", "fa-user-check", "Asistencias")} 
                ${crearLink("/evaluacion", "fa-clipboard-check", "Evaluación")} 
            `;
        }
        return;
    }

    if(usuario.rol === "alumno"){
        if(nav){
            nav.innerHTML = `
                ${crearLink("/dashboard_alumno", "fa-house", "Inicio")} 
            `;
        }
        return;
    }

    if(usuario.rol === "personal"){
        const permisos = usuario.permisos || [];
        const modulos = {
            "/alumnos":"alumnos",
            "/maestros":"maestros",
            "/materias":"materias",
            "/grupos":"grupos",
            "/evaluacion":"evaluacion"
        };

        const inicio = document.querySelector('nav a[href="/dashboard_admin"]');
        if(inicio){
            inicio.href = "/dashboard_personal";
        }

        document.querySelectorAll("nav a").forEach(link => {
            const modulo = modulos[link.getAttribute("href")];

            if(modulo && !permisos.includes(modulo)){
                link.style.display = "none";
            }

            if(["/personal", "/administrativos", "/configuracion"].includes(link.getAttribute("href"))){
                link.style.display = "none";
            }
        });
    }
}

aplicarPermisosSidebar();
