const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const session = require("express-session");
const path = require("path");
const { obtenerBaseUsuario, generarUsuarioUnico, generarPasswordTemporal } = require("./utils/userHelpers");
const crearRutasConfiguracion = require("./routes/configuracion");
const crearRutasUsuarios = require("./routes/usuarios");
const crearRutasPersonal = require("./routes/personal");
const crearRutasAcademicas = require("./routes/academico");
const authRoutes = require("./routes/auth");
const usuarioRoutes = require("./routes/usuario");
const inscripcionesRoutes = require("./routes/inscripciones");
require("./models/Usuario");
require("./models/AsignacionProfesor");
const {
    crearRutasActividades,
    registrarActividad
} = require("./routes/actividades");
const crearRutasAlumnos = require("./routes/alumnos");
const crearRutasMaestros = require("./routes/maestros");
const crearRutasMaterias = require("./routes/materias");
const crearRutasGrupos = require("./routes/grupos");
const {
    verificarSesion,
    verificarRol,
    verificarPermiso
} = require("./middleware/verificarRol");
const crearRutasProfesor = require("./routes/profesor");

const app = express();

// ========================
// CONFIGURACIONES
// ========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "secreto123",
    resave: false,
    saveUninitialized: true
}));

const rutasHtmlProtegidas = {
    "/dashboard_admin.html":"/dashboard_admin",
    "/dashboard_personal.html":"/dashboard_personal",
    "/dashboard_maestro.html":"/dashboard_maestro",
    "/dashboard_alumno.html":"/dashboard_alumno",
    "/alumnos.html":"/alumnos",
    "/maestros.html":"/maestros",
    "/materias.html":"/materias",
    "/grupos.html":"/grupos",
    "/personal.html":"/personal",
    "/configuracion.html":"/configuracion",
    "/evaluacion.html":"/evaluacion"
};

app.use((req, res, next) => {
    if(rutasHtmlProtegidas[req.path]){
        return res.redirect(rutasHtmlProtegidas[req.path]);
    }

    next();
});

app.use(express.static("public", {
    index: "index.html"
}));

// ========================
// CONEXIÓN A MONGODB
// ========================

mongoose.connect("mongodb://127.0.0.1:27017/sistema_escolar")
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.log(err));

const Usuario = require("./models/Usuario");
const Alumno = require("./models/Alumno");
const Maestro = require("./models/Maestro");
const Materia = require("./models/Materia");
const Grupo = require("./models/Grupo");
require("./models/Inscripcion");
require("./models/CriterioEvaluacion");
require("./models/Calificacion");
require("./models/Asistencia");


const verificarAdmin =
verificarRol("admin");

// Auth se monta después de registrar el modelo Usuario.
app.use(authRoutes);
app.use(usuarioRoutes);
app.use(inscripcionesRoutes);
// ========================
// RUTA ALUMNOS.HTML
// ========================

app.get("/alumnos", verificarSesion, verificarPermiso("alumnos"), (req, res) => {

    res.sendFile(path.join(__dirname, "public/alumnos.html"));

});

// ========================
// RUTA PERSONAL
// ========================

app.get("/personal",
verificarSesion,
verificarAdmin,
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "views/personal.html"
    ));

});

// Compatibilidad con la ruta anterior.
app.get("/administrativos",
verificarSesion,
verificarAdmin,
(req, res) => {

    res.redirect("/personal");

});

// ========================
// RUTA CONFIGURACION.HTML
// ========================

app.get("/configuracion",
verificarSesion,
verificarAdmin,
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "public/configuracion.html"
    ));

});


// ========================
// RUTA MAESTROS.HTML
// ========================

app.get("/maestros",
verificarSesion,
verificarPermiso("maestros"),
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "public/maestros.html"
    ));

});

// ========================
// RUTA MATERIAS.HTML
// ========================


app.get("/materias",
verificarSesion,
verificarPermiso("materias"),
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "public/materias.html"
    ));

});

// ========================
// RUTA GRUPOS.HTML
// ========================

app.get("/grupos",
verificarSesion,
verificarPermiso("grupos"),
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "public/grupos.html"
    ));

});


// ========================
// DASHBOARDS PROTEGIDOS
// ========================

app.get("/dashboard_admin", verificarSesion, verificarRol("admin"), (req, res) => {
    res.sendFile(path.join(__dirname, "public/dashboard_admin.html"));
});

app.get("/dashboard_personal", verificarSesion, verificarRol("admin", "personal"), (req, res) => {
    res.sendFile(path.join(__dirname, "public/dashboard_personal.html"));
});

app.get("/inscripciones", verificarSesion, verificarRol("admin", "personal"), (req, res) => {
    res.sendFile(path.join(__dirname, "views/inscripciones.html"));
});

app.get("/dashboard_administrativo", verificarSesion, (req, res) => {
    res.redirect("/dashboard_personal");
});

app.get("/dashboard_maestro", verificarSesion, verificarRol("admin", "maestro"), (req, res) => {
    res.sendFile(path.join(__dirname, "public/dashboard_maestro.html"));
});

app.get("/dashboard_alumno", verificarSesion, verificarRol("admin", "personal", "alumno"), (req, res) => {
    res.sendFile(path.join(__dirname, "public/dashboard_alumno.html"));
});

app.use(
crearRutasConfiguracion(
verificarSesion,
verificarAdmin
));

app.use(
crearRutasUsuarios(
verificarSesion,
verificarAdmin
));

app.use(
crearRutasPersonal(
verificarSesion,
verificarAdmin
));

app.use(
crearRutasActividades(
verificarSesion,
verificarAdmin
));

app.use(
crearRutasAlumnos(
verificarSesion,
verificarRol
));

app.use(
crearRutasMaestros(
verificarSesion,
verificarRol
));

app.use(
crearRutasMaterias(
verificarSesion,
verificarRol
));

app.use(
crearRutasGrupos(
verificarSesion,
verificarRol
));

app.use(
crearRutasProfesor(
verificarSesion,
verificarRol
));

app.use(
crearRutasAcademicas(
verificarSesion,
verificarRol
));

// ========================
// RESUMEN DASHBOARD ADMIN
// ========================

app.get("/api/dashboard/resumen",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        const [
        alumnos,
        maestros,
        materias,
        grupos,
        alumnosSemana,
        gruposActivos,
        materiasDisponibles,
        personalActivo
        ] = await Promise.all([
            Alumno.countDocuments(),
            Maestro.countDocuments(),
            Materia.countDocuments(),
            Grupo.countDocuments(),
            Alumno.countDocuments({
                _id:{
                    $gte:new mongoose.Types.ObjectId(
                    Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
                    .toString(16) + "0000000000000000"
                    )
                }
            }),
            Grupo.countDocuments({ activo:true }),
            Materia.countDocuments({ activa:true }),
            Usuario.countDocuments({
                rol:{
                    $in:[
                        "administrador",
                        "admin",
                        "personal",
                        "coordinador",
                        "instructor",
                        "auxiliar",
                        "capturista",
                        "maestro",
                        "administrativo"
                    ]
                },
                activo:{
                    $ne:false
                }
            })
        ]);

        res.json({
            alumnos,
            maestros,
            materias,
            grupos,
            alumnosSemana,
            gruposActivos,
            materiasDisponibles,
            personalActivo
        });

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo resumen"
        });

    }

});

app.get("/api/dashboard/estado",
verificarSesion,
verificarAdmin,
async (req, res) => {

    res.json({
        mongoConectado:mongoose.connection.readyState === 1,
        sesionActiva:Boolean(req.session.usuario),
        fecha:new Date(),
        tipoSistema:"Escolar"
    });

});

app.get("/api/dashboard/alertas",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        const [
        gruposSinTutor,
        materiasSinMaestro,
        personalInactivo
        ] = await Promise.all([
            Grupo.countDocuments({
                $or:[
                    { tutor:{ $exists:false } },
                    { tutor:"" }
                ]
            }),
            Materia.countDocuments({
                $or:[
                    { maestro:{ $exists:false } },
                    { maestro:"" }
                ]
            }),
            Usuario.countDocuments({
                rol:{
                    $in:[
                        "administrador",
                        "admin",
                        "personal",
                        "coordinador",
                        "instructor",
                        "auxiliar",
                        "capturista",
                        "maestro",
                        "administrativo"
                    ]
                },
                activo:false
            })
        ]);

        const alertas = [];

        if(gruposSinTutor > 0){
            alertas.push({
                tipo:"warning",
                icono:"fa-users",
                texto:`${gruposSinTutor} grupo(s) sin profesor o tutor asignado`
            });
        }

        if(materiasSinMaestro > 0){
            alertas.push({
                tipo:"warning",
                icono:"fa-book",
                texto:`${materiasSinMaestro} materia(s) sin maestro asignado`
            });
        }

        if(personalInactivo > 0){
            alertas.push({
                tipo:"info",
                icono:"fa-id-badge",
                texto:`${personalInactivo} miembro(s) del personal inactivo`
            });
        }

        res.json(alertas);

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo alertas"
        });

    }

});

// ========================
// CRUD PERSONAL LEGADO
// ========================

app.get("/api/administrativos",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        const administrativos =
        await Usuario.find({
            rol:{
                $in:["personal", "administrativo"]
            }
        });

        res.json(administrativos);

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo personal"
        });

    }

});

app.post("/api/administrativos",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        const nuevoAdministrativo =
        new Usuario({
            usuario:req.body.usuario,
            password:req.body.password || "123456",
            rol:"personal",
            activo:req.body.activo !== false,
            permisos:req.body.permisos || []
        });

        await nuevoAdministrativo.save();

        res.json({
            mensaje:"Personal agregado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error agregando personal"
        });

    }

});

app.put("/api/administrativos/:id",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        const datos = {
            usuario:req.body.usuario,
            rol:"personal",
            activo:req.body.activo === true,
            permisos:req.body.permisos || []
        };

        if (req.body.password) {
            datos.password = await bcrypt.hash(req.body.password, 10);
        }

        await Usuario.findOneAndUpdate(
            {
                _id:req.params.id,
                rol:{
                    $in:["personal", "administrativo"]
                }
            },
            datos
        );

        res.json({
            mensaje:"Personal actualizado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando personal"
        });

    }

});

app.delete("/api/administrativos/:id",
verificarSesion,
verificarAdmin,
async (req, res) => {

    try {

        await Usuario.findOneAndDelete({
            _id:req.params.id,
            rol:{
                $in:["personal", "administrativo"]
            }
        });

        res.json({
            mensaje:"Personal eliminado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error eliminando personal"
        });

    }

});

// ========================
// CRUD ALUMNOS
// ========================

// OBTENER ALUMNOS

app.get("/api/alumnos", verificarSesion, verificarPermiso("alumnos"), async (req, res) => {

    try {

        const alumnos = await Alumno.find()
            .populate("grupoId", "nombre semestre carrera")
            .sort({ nombre:1 });

        res.json(alumnos);

    } catch (error) {

        res.status(500).json({
            error: "Error al obtener alumnos"
        });

    }

});

app.get("/api/alumnos/opciones",
verificarSesion,
verificarPermiso("alumnos"),
async (req, res) => {

    try {

        const grupos =
        await Grupo.find({ activo:{ $ne:false } })
        .select("nombre semestre carrera")
        .sort({ nombre:1 });

        res.json({ grupos });

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo opciones para alumnos"
        });

    }

});

// AGREGAR ALUMNO

app.post("/api/alumnos", verificarSesion, verificarPermiso("alumnos"), async (req, res) => {

    try {

        const { nombre, matricula, correo, carrera, semestre, grupoId, activo } = req.body;

        if (!nombre || !matricula || !carrera || !semestre) {
            return res.status(400).json({
                error: "Nombre, matrícula, carrera y semestre son obligatorios"
            });
        }

        const criteriosAlumno = [{ matricula }];
        const criteriosUsuario = [{ usuario: matricula }];

        if(correo){
            criteriosAlumno.push({ correo });
            criteriosUsuario.push({ correo });
        }

        const alumnoExistente = await Alumno.findOne({ $or:criteriosAlumno });
        const usuarioExistente = await Usuario.findOne({ $or:criteriosUsuario });

        if (alumnoExistente || usuarioExistente) {
            return res.status(400).json({
                error: "Ya existe un alumno con esa matrícula, correo o usuario"
            });
        }

        const passwordTemporal = req.body.password || generarPasswordTemporal();

        const nuevoUsuario = new Usuario({
            usuario: matricula,
            password: passwordTemporal,
            rol: "alumno",
            primerLogin: true,
            activo: true,
            estado: "activo",
            nombre,
            correo: correo || ""
        });

        await nuevoUsuario.save();

        const nuevoAlumno = new Alumno({
            nombre,
            correo: correo || "",
            matricula,
            carrera,
            semestre:Number(semestre),
            grupoId:grupoId || null,
            usuarioId: nuevoUsuario._id,
            activo: activo !== false
        });

        await nuevoAlumno.save();

        await registrarActividad({
            usuario: req.session.usuario.usuario,
            rol: req.session.usuario.rol,
            accion: "crear",
            modulo: "Alumnos",
            descripcion: `Alumno agregado: ${nombre}`
        });

        res.json({
            mensaje: "Alumno agregado",
            usuario: nuevoUsuario.usuario,
            contrasenaTemporal: passwordTemporal
        });

    } catch (error) {

        res.status(500).json({
            error: "Error al agregar alumno"
        });

    }

});

app.post("/api/alumnos/:id/reset-password", verificarSesion, verificarPermiso("alumnos"), async (req, res) => {
    try {
        const alumno = await Alumno.findById(req.params.id);

        if (!alumno) {
            return res.status(404).json({ error: "Alumno no encontrado" });
        }

        let usuario = null;

        if (alumno.usuarioId) {
            usuario = await Usuario.findById(alumno.usuarioId);
        }

        if (!usuario) {
            usuario = await Usuario.findOne({ usuario: alumno.matricula });
        }

        if (!usuario) {
            return res.status(404).json({ error: "Usuario de alumno no encontrado" });
        }

        const contrasenaTemporal = crypto.randomBytes(5).toString("hex");
        usuario.password = await bcrypt.hash(contrasenaTemporal, 10);
        usuario.primerLogin = true;

        await usuario.save();

        if (!alumno.usuarioId) {
            alumno.usuarioId = usuario._id;
            await alumno.save();
        }

        await registrarActividad({
            usuario: req.session.usuario.usuario,
            rol: req.session.usuario.rol,
            accion: "reset password",
            modulo: "Alumnos",
            descripcion: `Contraseña restablecida para alumno: ${alumno.nombre}`
        });

        res.json({
            mensaje: "Contraseña restablecida correctamente",
            usuario: usuario.usuario,
            contrasenaTemporal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error restableciendo contraseña" });
    }
});

// ELIMINAR ALUMNO

app.delete("/api/alumnos/:id",
verificarSesion,
verificarPermiso("alumnos"),
async (req, res) => {

    try {

        const alumno = await Alumno.findById(req.params.id);

        if(!alumno){
            return res.status(404).json({
                error:"Alumno no encontrado"
            });
        }

        await Promise.all([
            Alumno.findByIdAndDelete(req.params.id),
            alumno.usuarioId ? Usuario.findByIdAndDelete(alumno.usuarioId) : Usuario.findOneAndDelete({ usuario:alumno.matricula }),
            mongoose.model("Inscripcion").deleteMany({ alumnoId:req.params.id }),
            mongoose.model("Calificacion").deleteMany({ alumnoId:req.params.id }),
            mongoose.model("Asistencia").deleteMany({ alumnoId:req.params.id })
        ]);

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"eliminar",
            modulo:"Alumnos",
            descripcion:`Alumno eliminado: ${alumno.nombre}`
        });

        res.json({
            mensaje: "Alumno eliminado"
        });

    } catch (error) {

        res.status(500).json({
            error: "Error al eliminar"
        });

    }

});

// ACTUALIZAR ALUMNO

app.put("/api/alumnos/:id",
verificarSesion,
verificarPermiso("alumnos"),
async (req, res) => {

    try {

        const { nombre, matricula, correo, carrera, semestre, grupoId, estado } = req.body;

        if(!nombre || !matricula || !carrera || !semestre){
            return res.status(400).json({
                error:"Nombre, matrícula, carrera y semestre son obligatorios"
            });
        }

        const alumnoActual = await Alumno.findById(req.params.id);

        if(!alumnoActual){
            return res.status(404).json({
                error:"Alumno no encontrado"
            });
        }

        const criteriosAlumno = [{ matricula }];
        const criteriosUsuario = [{ usuario:matricula }];

        if(correo){
            criteriosAlumno.push({ correo });
            criteriosUsuario.push({ correo });
        }

        const alumnoDuplicado = await Alumno.findOne({
            _id:{ $ne:req.params.id },
            $or:criteriosAlumno
        });

        if(alumnoDuplicado){
            return res.status(400).json({
                error:"Ya existe otro alumno con esa matrícula o correo"
            });
        }

        let usuarioAlumno = alumnoActual.usuarioId
            ? await Usuario.findById(alumnoActual.usuarioId)
            : await Usuario.findOne({ usuario:alumnoActual.matricula });

        if(usuarioAlumno){
            const usuarioDuplicado = await Usuario.findOne({
                _id:{ $ne:usuarioAlumno._id },
                $or:criteriosUsuario
            });

            if(usuarioDuplicado){
                return res.status(400).json({
                    error:"Ya existe otro usuario con esa matrícula o correo"
                });
            }
        }

        const estadoAlumno = estado || "activo";

        const alumnoActualizado =
        await Alumno.findByIdAndUpdate(

            req.params.id,

            {
                nombre,
                correo: correo || "",
                matricula,
                carrera,
                semestre:Number(semestre),
                grupoId:grupoId || null,
                activo: estadoAlumno === "activo",
                estado: estadoAlumno
            },

            {
                new:true
            }

        );

        if(usuarioAlumno){
            usuarioAlumno.nombre = nombre;
            usuarioAlumno.correo = correo || "";
            usuarioAlumno.usuario = matricula;
            usuarioAlumno.activo = estadoAlumno === "activo";
            usuarioAlumno.estado = estadoAlumno;
            await usuarioAlumno.save();
        }

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"editar",
            modulo:"Alumnos",
            descripcion:`Alumno actualizado: ${nombre}`
        });

        res.json({
            mensaje:"Alumno actualizado"
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            error:"Error actualizando alumno"
        });

    }

});

// ========================
// CRUD MAESTROS
// ========================

app.get(
"/api/maestros",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {

        const maestros =
        await Maestro.find();

        res.json(maestros);

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo maestros"
        });

    }

});

app.get(
"/api/maestros/:id",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {
    try {
        const maestro = await Maestro.findById(req.params.id);
        if(!maestro){
            return res.status(404).json({ error: "Maestro no encontrado" });
        }
        res.json(maestro);
    } catch(error){
        res.status(500).json({ error: "Error obteniendo maestro" });
    }
});

app.post(
"/api/maestros",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {
        if(!req.body.nombre || !req.body.correo){
            return res.status(400).json({
                error:"Nombre y correo son obligatorios"
            });
        }

        // Normalizar correo para comparaciones y guardado
        const correoNorm = (req.body.correo || "").trim().toLowerCase();

        const existe = await Maestro.findOne({ correo: correoNorm });
        const usuarioExiste = await Usuario.findOne({ correo: correoNorm });

        // Si existe un usuario maestro huérfano (usuario existe pero maestro no), eliminarlo y continuar
        if(usuarioExiste && !existe && usuarioExiste.rol === "maestro"){
            await Usuario.findByIdAndDelete(usuarioExiste._id);
        }

        if(existe || (await Usuario.findOne({ correo: correoNorm }))) {
            return res.status(400).json({
                error:"Ya existe un profesor con ese correo"
            });
        }

        const nuevoMaestro = new Maestro({
            nombre: req.body.nombre,
            correo: correoNorm,
            especialidad: req.body.especialidad,
            activo: true,
            estado: "activo"
        });

       await nuevoMaestro.save();

        const baseUsuario = obtenerBaseUsuario(correoNorm, req.body.nombre);
        const usuarioGenerado = await generarUsuarioUnico(baseUsuario, Usuario);
        const contrasenaTemporal = generarPasswordTemporal();

        const nuevoUsuario = new Usuario({
            nombre: req.body.nombre,
            correo: correoNorm,
            usuario: usuarioGenerado,
            password: contrasenaTemporal,
            rol: "maestro",
            primerLogin: true,
            activo: true,
            estado: "activo",
            fechaRestablecimiento: new Date()
        });

        await nuevoUsuario.save();

await registrarActividad({
    usuario:req.session.usuario.usuario,
    rol:req.session.usuario.rol,
    accion:"crear",
    modulo:"Personal",
    descripcion:`Profesor agregado: ${req.body.nombre}`
});

res.json({
    mensaje: "Profesor agregado",
            usuario:usuarioGenerado,
            contrasenaTemporal:contrasenaTemporal
});

    } catch(error){

        res.status(500).json({
            error:"Error creando maestro"
        });

    }

});

app.delete(
"/api/maestros/:id",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {

        const maestro = await Maestro.findByIdAndDelete(req.params.id);

        if(!maestro){
            return res.status(404).json({ error:"Maestro no encontrado" });
        }

        // Eliminar usuario asociado (case-insensitive)
        const correoMaestro = (maestro.correo || "").trim();
        let usuarioBorrado = await Usuario.findOneAndDelete({ correo: correoMaestro, rol: "maestro" });
        if(!usuarioBorrado){
            // intentar case-insensitive
            usuarioBorrado = await Usuario.findOneAndDelete({ correo: { $regex: `^${correoMaestro.replace(/[-\\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' }, rol: "maestro" });
        }

        res.json({
            mensaje:"Maestro eliminado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error eliminando maestro"
        });

    }

});

app.put(
"/api/maestros/:id",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {
        const estado = req.body.estado || "activo";

        const maestroActual = await Maestro.findById(req.params.id);

        if(!maestroActual){
            return res.status(404).json({ error:"Maestro no encontrado" });
        }

        await Maestro.findByIdAndUpdate(
            req.params.id,
            {
                nombre:req.body.nombre,
                correo:req.body.correo,
                especialidad:req.body.especialidad,
                activo: estado === "activo",
                estado
            }
        );

        const usuarioMaestro = await Usuario.findOne({ correo: maestroActual.correo });

        if(usuarioMaestro){
            usuarioMaestro.nombre = req.body.nombre;
            usuarioMaestro.correo = req.body.correo;
            usuarioMaestro.activo = estado === "activo";
            usuarioMaestro.estado = estado;
            await usuarioMaestro.save();
        }

        res.json({
            mensaje:"Maestro actualizado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando maestro"
        });

    }

});

app.post(
"/api/maestros/:id/reset-password",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {
    try {
        const maestro = await Maestro.findById(req.params.id);

        if(!maestro){
            return res.status(404).json({ error:"Maestro no encontrado" });
        }

        // Buscar usuario case-insensitive por correo del maestro
        const correoMaestro = (maestro.correo || "").trim();
        let usuarioMaestro = await Usuario.findOne({ correo: correoMaestro, rol: "maestro" });
        if(!usuarioMaestro){
            usuarioMaestro = await Usuario.findOne({ correo: { $regex: `^${correoMaestro.replace(/[-\\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' }, rol: "maestro" });
        }

        if(!usuarioMaestro){
            return res.status(404).json({ error:"Usuario de maestro no encontrado" });
        }

        const contrasenaTemporal = generarPasswordTemporal();
        usuarioMaestro.password = await bcrypt.hash(contrasenaTemporal, 10);
        usuarioMaestro.primerLogin = true;
        usuarioMaestro.fechaRestablecimiento = new Date();

        await usuarioMaestro.save();

        res.json({
            mensaje: "Contraseña temporal restablecida",
            usuario: usuarioMaestro.usuario,
            contrasenaTemporal
        });

    } catch(error){
        res.status(500).json({ error:"Error restableciendo contraseña" });
    }
});

app.get(
"/api/materias",
verificarSesion,
verificarPermiso("materias"),
async (req, res) => {

    try {

        const materias =
        await Materia.find();

        res.json(materias);

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo materias"
        });

    }

});

app.post(
"/api/materias",
verificarSesion,
verificarPermiso("materias"),
async (req, res) => {

    try {
        const { nombre, clave, semestre, creditos, maestro, activa, grupoIds } = req.body;

        if(!nombre || !clave || !semestre || !creditos){
            return res.status(400).json({
                error:"Nombre, clave, semestre y créditos son obligatorios"
            });
        }

        const existe = await Materia.findOne({ clave });

        if(existe){
            return res.status(400).json({
                error:"Ya existe una materia con esa clave"
            });
        }

        const nuevaMateria =
        new Materia({

            nombre,
            clave,
            semestre:Number(semestre),
            creditos:Number(creditos),
            maestro:maestro || "",
            grupoIds:Array.isArray(grupoIds) ? grupoIds : [],
            activa:activa !== false

        });

        await nuevaMateria.save();

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"crear",
            modulo:"Materias",
            descripcion:`Materia creada: ${nombre}`
        });

        res.json({
            mensaje:"Materia agregada"
        });

    } catch(error){

        res.status(500).json({
            error:"Error agregando materia"
        });

    }

});

app.delete(
"/api/materias/:id",
verificarSesion,
verificarPermiso("materias"),
async (req, res) => {

    try {

        const materia = await Materia.findById(req.params.id);

        if(!materia){
            return res.status(404).json({
                error:"Materia no encontrada"
            });
        }

        await Promise.all([
            Materia.findByIdAndDelete(req.params.id),
            mongoose.model("Inscripcion").deleteMany({ materiaId:req.params.id }),
            mongoose.model("Calificacion").deleteMany({ materiaId:req.params.id }),
            mongoose.model("Asistencia").deleteMany({ materiaId:req.params.id })
        ]);

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"eliminar",
            modulo:"Materias",
            descripcion:`Materia eliminada: ${materia.nombre}`
        });

        res.json({
            mensaje:"Materia eliminada"
        });

    } catch(error){

        res.status(500).json({
            error:"Error eliminando materia"
        });

    }

});

app.put(
"/api/materias/:id",
verificarSesion,
verificarPermiso("materias"),
async (req, res) => {

    try {
        const { nombre, clave, semestre, creditos, maestro, activa, grupoIds } = req.body;

        if(!nombre || !clave || !semestre || !creditos){
            return res.status(400).json({
                error:"Nombre, clave, semestre y créditos son obligatorios"
            });
        }

        const duplicada = await Materia.findOne({
            clave,
            _id:{ $ne:req.params.id }
        });

        if(duplicada){
            return res.status(400).json({
                error:"Ya existe otra materia con esa clave"
            });
        }

        await Materia.findByIdAndUpdate(

            req.params.id,

            {
                nombre,
                clave,
                semestre:Number(semestre),
                creditos:Number(creditos),
                maestro:maestro || "",
                grupoIds:Array.isArray(grupoIds) ? grupoIds : [],
                activa:activa === true
            }

        );

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"editar",
            modulo:"Materias",
            descripcion:`Materia actualizada: ${nombre}`
        });

        res.json({
            mensaje:"Materia actualizada"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando materia"
        });

    }

});

// ========================
// RUTA GRUPOS.HTML
// ========================

app.get("/grupos",
verificarSesion,
verificarPermiso("grupos"),
(req, res) => {

    res.sendFile(
    path.join(
    __dirname,
    "public/grupos.html"
    ));

});

app.get(
"/api/grupos",
verificarSesion,
verificarPermiso("grupos"),
async (req, res) => {

    try {

        const grupos =
        await Grupo.find().sort({ nombre:1 });

        const Inscripcion = mongoose.model("Inscripcion");

        const gruposConConteos = await Promise.all(
            grupos.map(async grupo => {
                const [alumnosCount, materiasInscritas] = await Promise.all([
                    Alumno.countDocuments({ grupoId:grupo._id }),
                    Inscripcion.distinct("materiaId", { grupoId:grupo._id, estado:{ $ne:"archivada" } })
                ]);

                const item = grupo.toObject();
                item.alumnosCount = alumnosCount;
                item.materiasCount = new Set([
                    ...(item.materiaIds || []).map(id => String(id)),
                    ...materiasInscritas.map(id => String(id))
                ]).size;

                return item;
            })
        );

        res.json(gruposConConteos);

    } catch(error){

        res.status(500).json({
            error:"Error obteniendo grupos"
        });

    }

});

app.post(
"/api/grupos",
verificarSesion,
verificarPermiso("grupos"),
async (req, res) => {

    try {
        const { nombre, semestre, carrera, tutor, activo, materiaIds } = req.body;

        if(!nombre || !semestre || !carrera){
            return res.status(400).json({
                error:"Nombre, semestre y carrera son obligatorios"
            });
        }

        const duplicado = await Grupo.findOne({ nombre, semestre:Number(semestre), carrera });

        if(duplicado){
            return res.status(400).json({
                error:"Ya existe un grupo con ese nombre, semestre y carrera"
            });
        }

        const nuevoGrupo =
        new Grupo({

            nombre,
            semestre:Number(semestre),
            carrera,
            tutor:tutor || "",
            materiaIds:Array.isArray(materiaIds) ? materiaIds : [],
            activo:activo !== false

        });

        await nuevoGrupo.save();

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"crear",
            modulo:"Grupos",
            descripcion:`Grupo creado: ${nombre}`
        });

        res.json({
            mensaje:"Grupo agregado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error agregando grupo"
        });

    }

});

app.delete(
"/api/grupos/:id",
verificarSesion,
verificarPermiso("grupos"),
async (req, res) => {

    try {

        const grupo = await Grupo.findById(req.params.id);

        if(!grupo){
            return res.status(404).json({
                error:"Grupo no encontrado"
            });
        }

        await Promise.all([
            Grupo.findByIdAndDelete(req.params.id),
            Alumno.updateMany({ grupoId:req.params.id }, { $set:{ grupoId:null } }),
            mongoose.model("Inscripcion").deleteMany({ grupoId:req.params.id }),
            mongoose.model("Calificacion").deleteMany({ grupoId:req.params.id }),
            mongoose.model("Asistencia").deleteMany({ grupoId:req.params.id })
        ]);

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"eliminar",
            modulo:"Grupos",
            descripcion:`Grupo eliminado: ${grupo.nombre}`
        });

        res.json({
            mensaje:"Grupo eliminado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error eliminando grupo"
        });

    }

});

app.put(
"/api/grupos/:id",
verificarSesion,
verificarPermiso("grupos"),
async (req, res) => {

    try {
        const { nombre, semestre, carrera, tutor, activo, materiaIds } = req.body;

        if(!nombre || !semestre || !carrera){
            return res.status(400).json({
                error:"Nombre, semestre y carrera son obligatorios"
            });
        }

        const duplicado = await Grupo.findOne({
            nombre,
            semestre:Number(semestre),
            carrera,
            _id:{ $ne:req.params.id }
        });

        if(duplicado){
            return res.status(400).json({
                error:"Ya existe otro grupo con ese nombre, semestre y carrera"
            });
        }

        await Grupo.findByIdAndUpdate(

            req.params.id,

            {
                nombre,
                semestre:Number(semestre),
                carrera,
                tutor:tutor || "",
                materiaIds:Array.isArray(materiaIds) ? materiaIds : [],
                activo:activo === true
            }

        );

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"editar",
            modulo:"Grupos",
            descripcion:`Grupo actualizado: ${nombre}`
        });

        res.json({
            mensaje:"Grupo actualizado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando grupo"
        });

    }

});


// ========================
// PERFIL (EJEMPLO)
// ========================

app.get("/perfil", verificarSesion, (req, res) => {
    res.send(`Bienvenido ${req.session.usuario.usuario}`);
});


// ========================
// SERVIDOR
// ========================

app.listen(3000, () => {

    console.log("Servidor en http://localhost:3000");

});
