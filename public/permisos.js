async function aplicarPermisosSidebar(){

    const res =
    await fetch("/usuario");

    if(!res.ok){
        return;
    }

    const usuario =
    await res.json();

    if(usuario.rol !== "personal"){
        return;
    }

    const permisos =
    usuario.permisos || [];

    const modulos = {
        "/alumnos":"alumnos",
        "/maestros":"maestros",
        "/materias":"materias",
        "/grupos":"grupos"
    };

    const inicio =
    document.querySelector('nav a[href="/dashboard_admin"]');

    if(inicio){
        inicio.href = "/dashboard_personal";
    }

    document
    .querySelectorAll("nav a")
    .forEach(link => {

        const modulo =
        modulos[link.getAttribute("href")];

        if(modulo && !permisos.includes(modulo)){
            link.style.display = "none";
        }

        if(link.getAttribute("href") === "/personal"){
            link.style.display = "none";
        }

        if(link.getAttribute("href") === "/administrativos"){
            link.style.display = "none";
        }

        if(link.getAttribute("href") === "/configuracion"){
            link.style.display = "none";
        }

    });

}

aplicarPermisosSidebar();
