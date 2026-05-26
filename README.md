# Sistema Escolar

Sistema escolar con Node.js, Express, MongoDB/Mongoose, sesiones, roles y módulos administrativos.

## Funcionalidades

- Login con sesión y redirección por rol.
- Dashboards para administrador, personal, profesor y alumno.
- CRUD de alumnos, materias, grupos, profesores y personal.
- Generación de usuario y contraseña temporal para alumnos y personal.
- Inscripciones de alumnos a materias y grupos.
- Evaluación académica con criterios por materia/grupo, porcentajes que suman 100%, calificaciones por periodo y cálculo automático.
- Registro de asistencias y cálculo de porcentaje para el alumno.
- Dashboard de alumno con nombre, grupo, materias, calificaciones, promedio, asistencias y progreso con datos reales.
- Actividades recientes para acciones importantes del sistema.
- Script de datos demo para presentación.

## Roles

- `admin`: acceso total.
- `personal`: acceso según permisos y cargo.
- `maestro`: acceso al panel de profesor y evaluación.
- `alumno`: acceso solo al portal del alumno.

## Ejecutar

```bash
npm install
npm run seed
npm start
```

También puedes arrancar directamente con:

```bash
node server.js
```

Abre:

```text
http://localhost:3000
```

## Usuarios Demo

Después de `npm run seed`:

- Administrador: `admin` / `123456`
- Alumno: `A001` / `alumno123`
- Alumno: `A002` / `alumno123`

MongoDB debe estar disponible en `mongodb://127.0.0.1:27017/sistema_escolar`.
