# Healthcare API - Guía de Inicio Rápido

## Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- PostgreSQL 16 (si no usas Docker)

## Configuración

1. **Clonar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

2. **Editar `.env` con tus credenciales** (especialmente `JWT_SECRET`)

3. **Iniciar servicios con Docker:**
   ```bash
   docker-compose up -d
   ```

4. **Instalar dependencias:**
   ```bash
   npm install
   ```

5. **Generar cliente de Prisma:**
   ```bash
   npx prisma generate
   ```

6. **Ejecutar migraciones:**
   ```bash
   npx prisma migrate dev
   ```

7. **Ejecutar seed (opcional):**
   ```bash
   npx prisma db seed
   ```

8. **Iniciar aplicación:**
   ```bash
   npm run start:dev
   ```

## Problema: Docker no funciona

Si tienes problemas con Docker:

1. **Reinicia Docker Desktop**
2. **O instala PostgreSQL localmente** y actualiza `DATABASE_URL` en `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthcare_db
   ```

## Testing de la API

### 1. Crear un usuario (requiere seed o creación manual):

```bash
# Usando seed
npx prisma db seed
```

### 2. Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthcare.com","password":"Admin123!@#"}'
```

### 3. Acceder al perfil (con cookie):

```bash
curl -X POST http://localhost:3000/auth/me \
  --cookie "access_token=YOUR_TOKEN"
```

### 4. Logout:

```bash
curl -X POST http://localhost:3000/auth/logout \
  --cookie "access_token=YOUR_TOKEN"
```

## Endpoints Disponibles

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Renovar tokens
- `POST /auth/logout` - Cerrar sesión
- `POST /auth/me` - Obtener perfil del usuario actual

### Usuarios (requiere autenticación)
- `GET /users` - Listar usuarios
- `GET /users/:id` - Obtener usuario por ID
- `POST /users` - Crear usuario
- `PATCH /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

## Arquitectura de Seguridad

### Tokens JWT
- **Access Token**: 15 minutos (en cookie httpOnly)
- **Refresh Token**: 7 días (en cookie httpOnly)

### Características de Seguridad Implementadas
- ✅ Hashing de contraseñas con bcrypt (12 rounds)
- ✅ Cookies httpOnly para prevenir XSS
- ✅ Bloqueo de cuenta tras 5 intentos fallidos
- ✅ Rotación de refresh tokens
- ✅ Control de acceso basado en roles (RBAC)

### Roles Disponibles
- `ADMIN` - Control total del sistema
- `DOCTOR` - Acceso a funciones médicas
- `STAFF` - Gestión operativa
- `PATIENT` - Acceso limitado a datos propios

## Siguientes Pasos

1. ✅ Infraestructura Docker
2. ✅ Base de datos PostgreSQL
3. ✅ Modelos Prisma
4. ✅ Autenticación JWT
5. ✅ Guards y decoradores
6. 🚧 Testing e2e
7. 🚧 Módulo Patients
8. 🚧 Módulo Doctors
9. 🚧 Módulo Appointments

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que Docker esté ejecutándose
- Verifica las credenciales en `.env`
- Verifica que el puerto 5432 esté disponible

### Error: "PrismaClient not generated"
```bash
npx prisma generate
```

### Error: "Migration failed"
```bash
# Resetear base de datos (⚠️ elimina todos los datos)
npx prisma migrate reset
```
