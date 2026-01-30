# Healthcare API

Backend API for a healthcare management system built with **NestJS**, **Prisma**, and **PostgreSQL**, designed following clean architecture and scalable SaaS principles.

This project serves as the foundation for managing users, authentication, roles, and future healthcare-related features such as appointments, doctors, and patients.

---

##  Tech Stack

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
