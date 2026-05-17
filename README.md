# CitaBox API

Backend API para **CitaBox**, la plataforma SaaS de gestión clínica. Construido con **NestJS**, **Prisma** y **PostgreSQL**.

## Estado de v1

- Alcance activo: agenda, pacientes, expediente clinico, portal del paciente y booking publico.
- La facturacion electronica no forma parte de la primera version.
- El codigo historico de billing puede seguir existiendo en el repositorio, pero no debe considerarse parte del runtime activo de v1.

## Tech Stack

- **NestJS**
- **PostgreSQL**
- **Prisma ORM**
- **JWT**
- **Docker / Docker Compose**
- **bcrypt**

## Estado tecnico

- Entorno dockerizado
- Base de datos conectada
- Prisma configurado
- Modulos de auth, clinics, users, patients, appointments, medical-records y booking activos
- Billing removido del runtime principal de v1

## Nota

Si necesitas limpiar mas el alcance historico, revisa:

- `docs/PRD.md`
- `docs/backend.md`
- `docs/API_REFERENCE.md`
- `src/billing/*`
