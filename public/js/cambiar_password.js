function mostrarMensaje(texto, tipo = "success") {
    const mensaje = document.getElementById("cambiarMensaje");
    mensaje.innerText = texto;
    mensaje.className = `form-feedback ${tipo}`;
}

function limpiarMensaje() {
    const mensaje = document.getElementById("cambiarMensaje");
    mensaje.innerText = "";
    mensaje.className = "form-feedback";
}

async function enviarCambioPassword(event) {
    event.preventDefault();
    limpiarMensaje();

    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!password || !confirmPassword) {
        mostrarMensaje("Completa ambos campos.", "error");
        return;
    }

    if (password !== confirmPassword) {
        mostrarMensaje("Las contraseñas no coinciden.", "error");
        return;
    }

    try {
        const respuesta = await fetch("/cambiar-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password, confirmPassword })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo cambiar la contraseña");
        }

        mostrarMensaje(data.mensaje || "Contraseña actualizada.", "success");
        setTimeout(() => {
            window.location.href = data.redirect || "/";
        }, 1200);
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message, "error");
    }
}

document.getElementById("cambiarPasswordForm").addEventListener("submit", enviarCambioPassword);
