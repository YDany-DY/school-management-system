# School Management System

Web application for managing a school system with role-based authentication.

## Features

* Login system with roles (admin, administrative staff, teacher, student)
* Role-based access control
* MongoDB database integration
* Dashboard for each user role

## User Roles

- Administrator: Full system control
- Administrative Staff: Manage students, courses, and records
- Teacher: Manage courses, tasks, and grades
- Student: View courses, tasks, and personal progress

## Technologies

* HTML, CSS, JavaScript
* Node.js
* Express
* MongoDB
* Mongoose

## Project Structure
```text
public/
  ├── index.html
  ├── admin.html
  ├── alumno.html
  ├── dashboard_admin.html
  ├── dashboard_alumno.html
  └── styles.css

server.js
package.json
```

## How to run
```bash
npm install
node server.js

Then open in your browser:
http://localhost:3000

## Note

This project is for educational and portfolio purposes. Unauthorized use or distribution is not permitted.
