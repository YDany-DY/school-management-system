const mongoose = require("mongoose");

const Usuario = require("../models/Usuario");
const Alumno = require("../models/Alumno");
const Materia = require("../models/Materia");
const Grupo = require("../models/Grupo");
const Inscripcion = require("../models/Inscripcion");
const CriterioEvaluacion = require("../models/CriterioEvaluacion");
const Calificacion = require("../models/Calificacion");
const Asistencia = require("../models/Asistencia");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/sistema_escolar";

async function asegurarUsuario(datos){
    let usuario = await Usuario.findOne({ usuario:datos.usuario });

    if(usuario){
        usuario.nombre = datos.nombre;
        usuario.correo = datos.correo;
        usuario.password = datos.password;
        usuario.rol = datos.rol;
        usuario.primerLogin = datos.primerLogin;
        usuario.activo = datos.activo;
        usuario.permisos = datos.permisos || [];
        await usuario.save();
        return usuario;
    }

    usuario = new Usuario(datos);
    await usuario.save();
    return usuario;
}

async function asegurarGrupo(){
    return Grupo.findOneAndUpdate(
        { nombre:"1A", carrera:"Ingeniería en Sistemas" },
        {
            nombre:"1A",
            semestre:1,
            carrera:"Ingeniería en Sistemas",
            tutor:"Coordinación académica",
            activo:true
        },
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function asegurarMateria(datos){
    return Materia.findOneAndUpdate(
        { clave:datos.clave },
        datos,
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function asegurarAlumno(datos){
    const usuario = await asegurarUsuario({
        usuario:datos.matricula,
        password:"alumno123",
        rol:"alumno",
        primerLogin:false,
        activo:true,
        nombre:datos.nombre,
        correo:datos.correo
    });

    return Alumno.findOneAndUpdate(
        { matricula:datos.matricula },
        {
            ...datos,
            usuarioId:usuario._id,
            activo:true
        },
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function asegurarInscripcion(alumno, materia, grupo){
    return Inscripcion.findOneAndUpdate(
        { alumnoId:alumno._id, materiaId:materia._id, grupoId:grupo._id },
        {
            alumnoId:alumno._id,
            materiaId:materia._id,
            grupoId:grupo._id,
            estado:"activa"
        },
        { upsert:true, returnDocument:"after" }
    );
}

async function asegurarCriterio(materia, grupo){
    return CriterioEvaluacion.findOneAndUpdate(
        { nombre:"Parcial 1", materiaId:materia._id, grupoId:grupo._id, periodo:"Parcial 1" },
        {
            nombre:"Parcial 1",
            materiaId:materia._id,
            grupoId:grupo._id,
            periodo:"Parcial 1",
            componentes:[
                { nombre:"Examen", porcentaje:40 },
                { nombre:"Tareas", porcentaje:25 },
                { nombre:"Participación", porcentaje:15 },
                { nombre:"Proyecto", porcentaje:20 }
            ],
            activo:true
        },
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function asegurarCalificacion(alumno, materia, grupo, criterio, valores){
    const componentes = criterio.componentes.map(item => ({
        nombre:item.nombre,
        porcentaje:item.porcentaje,
        calificacion:valores[item.nombre] || 8
    }));

    const calificacion = componentes.reduce((suma, item) => {
        return suma + (item.calificacion * item.porcentaje / 100);
    }, 0);

    return Calificacion.findOneAndUpdate(
        { alumnoId:alumno._id, materiaId:materia._id, periodo:"Parcial 1" },
        {
            alumnoId:alumno._id,
            materiaId:materia._id,
            grupoId:grupo._id,
            criterioId:criterio._id,
            periodo:"Parcial 1",
            componentes,
            calificacion:Math.round(calificacion * 100) / 100,
            fecha:new Date()
        },
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function asegurarAsistencia(alumno, materia, grupo, estado, diasAtras){
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    fecha.setHours(0, 0, 0, 0);

    return Asistencia.findOneAndUpdate(
        { alumnoId:alumno._id, materiaId:materia._id, grupoId:grupo._id, fecha },
        {
            alumnoId:alumno._id,
            materiaId:materia._id,
            grupoId:grupo._id,
            fecha,
            estado
        },
        { upsert:true, returnDocument:"after", runValidators:true }
    );
}

async function seed(){
    await mongoose.connect(MONGO_URL);

    await asegurarUsuario({
        nombre:"Administrador Demo",
        correo:"admin@sistema.local",
        usuario:"admin",
        password:"123456",
        rol:"admin",
        primerLogin:false,
        activo:true,
        permisos:[]
    });

    const grupo = await asegurarGrupo();

    const [matematicas, basesDatos] = await Promise.all([
        asegurarMateria({
            nombre:"Matemáticas I",
            clave:"MAT-101",
            semestre:1,
            creditos:6,
            maestro:"Profesor Demo",
            grupoIds:[grupo._id],
            activa:true
        }),
        asegurarMateria({
            nombre:"Bases de Datos",
            clave:"BD-201",
            semestre:1,
            creditos:7,
            maestro:"Profesor Demo",
            grupoIds:[grupo._id],
            activa:true
        })
    ]);

    grupo.materiaIds = [matematicas._id, basesDatos._id];
    await grupo.save();

    const [ana, luis] = await Promise.all([
        asegurarAlumno({
            nombre:"Ana Martínez López",
            correo:"ana@sistema.local",
            matricula:"A001",
            carrera:"Ingeniería en Sistemas",
            semestre:1,
            grupoId:grupo._id
        }),
        asegurarAlumno({
            nombre:"Luis Hernández Cruz",
            correo:"luis@sistema.local",
            matricula:"A002",
            carrera:"Ingeniería en Sistemas",
            semestre:1,
            grupoId:grupo._id
        })
    ]);

    await Promise.all([
        asegurarInscripcion(ana, matematicas, grupo),
        asegurarInscripcion(ana, basesDatos, grupo),
        asegurarInscripcion(luis, matematicas, grupo),
        asegurarInscripcion(luis, basesDatos, grupo)
    ]);

    const [criterioMatematicas, criterioBases] = await Promise.all([
        asegurarCriterio(matematicas, grupo),
        asegurarCriterio(basesDatos, grupo)
    ]);

    await Promise.all([
        asegurarCalificacion(ana, matematicas, grupo, criterioMatematicas, {
            Examen:9,
            Tareas:10,
            Participación:9,
            Proyecto:9
        }),
        asegurarCalificacion(ana, basesDatos, grupo, criterioBases, {
            Examen:8.5,
            Tareas:9,
            Participación:10,
            Proyecto:9.5
        }),
        asegurarCalificacion(luis, matematicas, grupo, criterioMatematicas, {
            Examen:8,
            Tareas:8.5,
            Participación:9,
            Proyecto:8.5
        }),
        asegurarCalificacion(luis, basesDatos, grupo, criterioBases, {
            Examen:9,
            Tareas:8,
            Participación:8,
            Proyecto:9
        }),
        asegurarAsistencia(ana, matematicas, grupo, "presente", 0),
        asegurarAsistencia(ana, basesDatos, grupo, "presente", 1),
        asegurarAsistencia(luis, matematicas, grupo, "retardo", 0),
        asegurarAsistencia(luis, basesDatos, grupo, "presente", 1)
    ]);

    console.log("Datos demo listos");
    console.log("Admin: admin / 123456");
    console.log("Alumno: A001 / alumno123");
    console.log("Alumno: A002 / alumno123");

    await mongoose.disconnect();
}

seed().catch(async error => {
    console.error("No se pudieron insertar datos demo:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
