# CitaBox API 🏥

Backend API para la gestión de **CitaBox** – la plataforma SaaS de gestión clínica. Construido con **NestJS**, **Prisma** y **PostgreSQL**, siguiendo buenas prácticas de arquitectura modular y escalable. Dominio principal: **citabox.app**.

---

## Tech Stack

- **NestJS** – Backend framework
- **PostgreSQL** – Relational database
- **Prisma ORM** – Database access and migrations
- **JWT** – Authentication
- **Docker & Docker Compose** – Containerized development environment
- **bcrypt** – Password hashing

---

## Project Status

✅ Dockerized environment  
✅ Database connected and running  
✅ Prisma configured with migrations  
✅ Users module implemented  
✅ Authentication (Register / Login) with JWT  
✅ Role-based user model (ADMIN, DOCTOR, PATIENT)

---

## Current Architecture

```txt
src/
├── auth/        # Authentication & JWT logic
├── users/       # User management
├── prisma/      # Prisma client and database access
└── main.ts
```
