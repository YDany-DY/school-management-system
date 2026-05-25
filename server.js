const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const session = require("express-session");
const path = require("path");
const crearRutasConfiguracion = require("./routes/configuracion");
const crearRutasUsuarios = require("./routes/usuarios");
const crearRutasPersonal = require("./routes/personal");
const authRoutes = require("./routes/auth");
const usuarioRoutes = require("./routes/usuario");
const inscripcionesRoutes = require("./routes/inscripciones");
require("./models/Usuario");
const {
    crearRutasActividades,
    registrarActividad
} = require("./routes/actividades");
const {
    verificarSesion,
    verificarRol,
    verificarPermiso
} = require("./middleware/verificarRol");

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

// IMPORTANTE: quitar acceso directo a dashboards
app.use(express.static("public", {
    index: "index.html"
}));

// ========================
// CONEXIÓN A MONGODB
// ========================

mongoose.connect("mongodb://127.0.0.1:27017/sistema_escolar")
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.log(err));

// ========================
// MODELO USUARIO
// ========================

const Usuario = require("./models/Usuario");

// ========================
// MODELO ALUMNO
// ========================

const alumnoSchema = new mongoose.Schema({

    nombre: String,
    correo: String,
    matricula: String,
    carrera: String,
    semestre: Number,
    usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
    },
    rol: {
        type: String,
        default: "alumno"
    },
    activo: Boolean

});

const Alumno = mongoose.model("Alumno", alumnoSchema);

// ========================
// MODELO MAESTRO
// ========================

const maestroSchema = new mongoose.Schema({

    nombre: String,
    correo: String,
    especialidad: String,
    activo: Boolean

});

const Maestro =
mongoose.model("Maestro", maestroSchema);

// ========================
// MODELO MATERIA
// ========================

const materiaSchema =
new mongoose.Schema({

    nombre:String,

    clave:String,

    semestre:Number,

    creditos:Number,

    maestro:String,

    activa:Boolean

});

const Materia =
mongoose.model("Materia", materiaSchema);


// ========================
// MODELO GRUPO
// ========================

const grupoSchema =
new mongoose.Schema({

    nombre:String,

    semestre:Number,

    carrera:String,

    tutor:String,

    activo:Boolean

});

const Grupo =
mongoose.model("Grupo", grupoSchema);


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

app.get("/dashboard_maestro", verificarSesion, verificarRol("maestro"), (req, res) => {
    res.sendFile(path.join(__dirname, "public/dashboard_maestro.html"));
});

app.get("/dashboard_alumno", verificarSesion, verificarRol("alumno"), (req, res) => {
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
                texto:`${gruposSinTutor} grupo(s) sin instructor o tutor asignado`
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
// CRUD ADMINISTRATIVOS
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
            error:"Error obteniendo administrativos"
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
            mensaje:"Administrativo agregado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error agregando administrativo"
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
            datos.password = req.body.password;
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
            mensaje:"Administrativo actualizado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando administrativo"
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
            mensaje:"Administrativo eliminado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error eliminando administrativo"
        });

    }

});

// ========================
// CRUD ALUMNOS
// ========================

// OBTENER ALUMNOS

app.get("/api/alumnos", verificarSesion, verificarPermiso("alumnos"), async (req, res) => {

    try {

        const alumnos = await Alumno.find();

        res.json(alumnos);

    } catch (error) {

        res.status(500).json({
            error: "Error al obtener alumnos"
        });

    }

});

// AGREGAR ALUMNO

app.post("/api/alumnos", verificarSesion, verificarPermiso("alumnos"), async (req, res) => {

    try {

        const { nombre, matricula, carrera, semestre, activo } = req.body;

        if (!nombre || !matricula || !carrera || !semestre) {
            return res.status(400).json({
                error: "Nombre, matrícula, carrera y semestre son obligatorios"
            });
        }

        const alumnoExistente = await Alumno.findOne({ matricula });
        const usuarioExistente = await Usuario.findOne({ usuario: matricula });

        if (alumnoExistente || usuarioExistente) {
            return res.status(400).json({
                error: "Ya existe un alumno con esa matrícula o usuario"
            });
        }

        const passwordTemporal = matricula;
        const passwordHash = await bcrypt.hash(passwordTemporal, 10);

        const nuevoUsuario = new Usuario({
            usuario: matricula,
            password: passwordHash,
            rol: "alumno",
            primerLogin: true,
            activo: true,
            nombre,
            correo: req.body.correo || ""
        });

        await nuevoUsuario.save();

        const nuevoAlumno = new Alumno({
            nombre,
            correo: req.body.correo || "",
            matricula,
            carrera,
            semestre,
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

        await Alumno.findByIdAndDelete(req.params.id);

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

        console.log("EDITANDO:", req.params.id);

        console.log(req.body);

        const alumnoActualizado =
        await Alumno.findByIdAndUpdate(

            req.params.id,

            {
                nombre: req.body.nombre,
                matricula: req.body.matricula,
                carrera: req.body.carrera,
                semestre: req.body.semestre,
                activo: req.body.activo === true
            },

            {
                new:true
            }

        );

        console.log(alumnoActualizado);

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"editar",
            modulo:"Alumnos",
            descripcion:`Alumno actualizado: ${req.body.nombre}`
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


app.post(
"/api/maestros",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {

        const nuevoMaestro =
        new Maestro({

            nombre:req.body.nombre,
            correo:req.body.correo,
            especialidad:req.body.especialidad,
            activo:true

        });

       await nuevoMaestro.save();

// CREAR USUARIO AUTOMÁTICAMENTE

const passwordHash = await bcrypt.hash("123456", 10);

const nuevoUsuario = new Usuario({
    nombre: req.body.nombre,
    correo: req.body.correo,
    usuario: req.body.correo,
    password: passwordHash,
    rol: "maestro",
    primerLogin: true,
    activo: true
});

await nuevoUsuario.save();

res.json({
    mensaje: "Maestro agregado"
});

    } catch(error){

        res.status(500).json({
            error:"Error agregando maestro"
        });

    }

});

app.delete(
"/api/maestros/:id",
verificarSesion,
verificarPermiso("maestros"),
async (req, res) => {

    try {

        await Maestro.findByIdAndDelete(
        req.params.id
        );

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

        await Maestro.findByIdAndUpdate(

            req.params.id,

            {
                nombre:req.body.nombre,
                correo:req.body.correo,
                especialidad:req.body.especialidad
            }

        );

        res.json({
            mensaje:"Maestro actualizado"
        });

    } catch(error){

        res.status(500).json({
            error:"Error actualizando maestro"
        });

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

        const nuevaMateria =
        new Materia({

            nombre:req.body.nombre,
            clave:req.body.clave,
            semestre:req.body.semestre,
            creditos:req.body.creditos,
            maestro:req.body.maestro,
            activa:true

        });

        await nuevaMateria.save();

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

        await Materia.findByIdAndDelete(
        req.params.id
        );

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

        await Materia.findByIdAndUpdate(

            req.params.id,

            {
                nombre:req.body.nombre,
                clave:req.body.clave,
                semestre:req.body.semestre,
                creditos:req.body.creditos,
                maestro:req.body.maestro
            }

        );

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"editar",
            modulo:"Materias",
            descripcion:`Materia actualizada: ${req.body.nombre}`
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
        await Grupo.find();

        res.json(grupos);

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

        const nuevoGrupo =
        new Grupo({

            nombre:req.body.nombre,
            semestre:req.body.semestre,
            carrera:req.body.carrera,
            tutor:req.body.tutor,
            activo:req.body.activo === true

        });

        await nuevoGrupo.save();

        await registrarActividad({
            usuario:req.session.usuario.usuario,
            rol:req.session.usuario.rol,
            accion:"crear",
            modulo:"Grupos",
            descripcion:`Grupo creado: ${req.body.nombre}`
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

        await Grupo.findByIdAndDelete(
        req.params.id
        );

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

        await Grupo.findByIdAndUpdate(

            req.params.id,

            {
                nombre:req.body.nombre,
                semestre:req.body.semestre,
                carrera:req.body.carrera,
                tutor:req.body.tutor,
                activo:req.body.activo === true
            }

        );

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
