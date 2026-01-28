# Sistema de Autenticación - Healthcare API

## 📋 Resumen Ejecutivo

Sistema de autenticación enterprise para Healthcare API con:
- ✅ **Login únicamente** (sin registro público)
- ✅ **HTTP-only cookies** para tokens
- ✅ **JWT firmado** con RS256/HS256
- ✅ **Registro manual** de usuarios (admin/script)
- ✅ **Refresh Token Rotation** para máxima seguridad
- ✅ **Rate Limiting** y protección contra fuerza bruta
- ✅ **Audit Logging** para compliance HIPAA

---

## 🏗️ Arquitectura del Sistema

### Estructura de Módulos

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── throttle.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       └── refresh-token.dto.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts  (protegido - solo ADMIN)
│   ├── users.service.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
│
├── prisma/
│   └── prisma.service.ts
│
└── common/
    ├── filters/
    │   └── http-exception.filter.ts
    └── interceptors/
        └── logging.interceptor.ts
```

---

## 🔐 Flujo de Autenticación

### 1. Login

```mermaid
sequenceDiagram
    Cliente->>API: POST /auth/login {email, password}
    API->>BD: Buscar usuario
    BD-->>API: Usuario encontrado
    API->>API: Validar password (bcrypt)
    API->>API: Generar Access Token (15min)
    API->>API: Generar Refresh Token (7d)
    API->>BD: Guardar hash de Refresh Token
    API-->>Cliente: Set-Cookie (HTTP-only, Secure)
    API-->>Cliente: {user: {...}}
```

### 2. Acceso a Recursos Protegidos

```mermaid
sequenceDiagram
    Cliente->>API: GET /resource (+ cookies)
    API->>Guard: Verificar Access Token
    Guard->>Guard: Validar firma JWT
    Guard->>Guard: Verificar expiración
    Guard-->>API: Token válido, user data
    API->>Controller: Procesar request
    Controller-->>Cliente: Response
```

### 3. Refresh Token

```mermaid
sequenceDiagram
    Cliente->>API: POST /auth/refresh (+ cookies)
    API->>BD: Buscar Refresh Token
    BD-->>API: Token encontrado
    API->>API: Validar firma y expiración
    API->>API: Generar nuevo Access Token
    API->>API: Rotar Refresh Token
    API->>BD: Actualizar hash de Refresh Token
    API-->>Cliente: Set-Cookie con nuevos tokens
    API-->>Cliente: Success
```

### 4. Logout

```mermaid
sequenceDiagram
    Cliente->>API: POST /auth/logout (+ cookies)
    API->>BD: Revocar Refresh Token
    BD-->>API: Token revocado
    API-->>Cliente: Clear-Cookie
    API-->>Cliente: Success
```

---

## 🗄️ Modelos de Base de Datos

### RefreshToken

```prisma
model RefreshToken {
  id           String   @id @default(uuid())
  tokenHash    String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenFamily  String
  version      Int      @default(1)
  expiresAt    DateTime
  isRevoked    Boolean  @default(false)
  createdAt    DateTime @default(now())
  ipAddress    String?
  userAgent    String?

  @@index([userId])
  @@index([tokenFamily])
  @@map("refresh_tokens")
}
```

### LoginAttempt

```prisma
model LoginAttempt {
  id         String   @id @default(uuid())
  email      String
  ipAddress  String
  success    Boolean
  attemptAt  DateTime @default(now())

  @@index([email, attemptAt])
  @@index([ipAddress, attemptAt])
  @@map("login_attempts")
}
```

### AuditLog

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String   // LOGIN, LOGOUT, ACCESS_PATIENT, etc.
  resource  String?
  ipAddress String
  userAgent String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### Actualización User

```prisma
model User {
  id                   String    @id @default(uuid())
  email                String    @unique
  password             String
  role                 Role
  isActive             Boolean   @default(true)
  
  // Campos de seguridad
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  lastLoginAt          DateTime?
  lastLoginIp          String?
  passwordChangedAt    DateTime?
  mfaEnabled           Boolean   @default(false)
  mfaSecret            String?
  
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relaciones
  refreshTokens        RefreshToken[]
  auditLogs            AuditLog[]

  @@map("users")
}
```

---

## 🔑 Estructura de Tokens

### Access Token (JWT)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "doctor@clinic.com",
  "role": "DOCTOR",
  "sessionId": "session-uuid",
  "iat": 1706342400,
  "exp": 1706343300
}
```

**Duración:** 15 minutos  
**Propósito:** Autorización de requests  
**Almacenamiento:** HTTP-only cookie

### Refresh Token (JWT)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "tokenFamily": "family-uuid",
  "version": 1,
  "iat": 1706342400,
  "exp": 1706947200
}
```

**Duración:** 7 días  
**Propósito:** Renovación de Access Token  
**Almacenamiento:** HTTP-only cookie + hash en BD

---

## 🚀 Endpoints de la API

### Auth Module (público/protegido)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | Login con email y password |
| POST | `/auth/logout` | ✅ | Cierra sesión y revoca tokens |
| POST | `/auth/refresh` | 🔄 | Renueva Access Token |
| GET | `/auth/me` | ✅ | Datos del usuario autenticado |
| PATCH | `/auth/change-password` | ✅ | Cambiar contraseña |

### Users Module (solo ADMIN)

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| POST | `/users` | ADMIN | Crear usuario manualmente |
| GET | `/users` | ADMIN | Listar usuarios (paginado) |
| GET | `/users/:id` | ADMIN | Obtener usuario específico |
| PATCH | `/users/:id` | ADMIN | Actualizar usuario |
| DELETE | `/users/:id` | ADMIN | Desactivar usuario |
| POST | `/users/:id/unlock` | ADMIN | Desbloquear cuenta |
| POST | `/users/:id/reset-password` | ADMIN | Resetear contraseña |

---

## ⚙️ Variables de Entorno

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-chars-here-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Cookie Configuration
COOKIE_SECRET=another-secret-for-cookie-signing
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false  # true en producción con HTTPS

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
RATE_LIMIT_TTL=900      # 15 minutos en segundos
RATE_LIMIT_MAX=5        # 5 intentos máximo

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthcare_db

# App
NODE_ENV=development
PORT=3000
```

---

## 📦 Dependencias Requeridas

```bash
# Dependencias principales
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt cookie-parser
npm install @nestjs/throttler

# Tipos de TypeScript
npm install -D @types/passport-jwt @types/bcrypt @types/cookie-parser
```

---

## 🛡️ Medidas de Seguridad Implementadas

### ✅ Implementadas en Fase Inicial

- [x] **HTTP-only Cookies**: Tokens no accesibles desde JavaScript
- [x] **JWT Firmado**: Algoritmo HS256 con secret robusto
- [x] **Bcrypt**: Hash de contraseñas con 12 salt rounds
- [x] **Token Rotation**: Refresh tokens se rotan en cada uso
- [x] **Rate Limiting**: Máximo 5 intentos de login en 15 minutos
- [x] **Account Lockout**: Bloqueo tras 5 intentos fallidos por 30 min
- [x] **Audit Logging**: Registro de todas las autenticaciones
- [x] **CORS Configurado**: Solo dominios permitidos
- [x] **Helmet**: Headers de seguridad HTTP

### 🚧 Pendientes (Fase Avanzada)

- [ ] **MFA/2FA**: Autenticación de dos factores con TOTP
- [ ] **Device Fingerprinting**: Detectar dispositivos nuevos
- [ ] **Sesiones Concurrentes**: Limitar dispositivos activos
- [ ] **Geolocalización**: Alertar accesos sospechosos
- [ ] **CSRF Protection**: Tokens anti-CSRF
- [ ] **Password Policies**: Complejidad y rotación forzada

---

## 🎯 Plan de Implementación

### ✅ Fase 1: Base (COMPLETADO)
- [x] Configuración de Docker y PostgreSQL
- [x] Prisma ORM configurado
- [x] Modelo User inicial

### 🔄 Fase 2: Infraestructura Auth (EN PROGRESO)
- [ ] PrismaService global
- [ ] Módulo Users (CRUD protegido)
- [ ] Nuevos modelos Prisma (RefreshToken, LoginAttempt, AuditLog)
- [ ] Migración de base de datos
- [ ] Script de seed para usuario admin inicial

### 📋 Fase 3: Auth Core
- [ ] Módulo Auth base
- [ ] AuthService con login logic
- [ ] JWT Strategy
- [ ] AuthController con endpoint /login
- [ ] HTTP-only cookies setup
- [ ] Refresh token flow

### 🔐 Fase 4: Seguridad y Guards
- [ ] JWT Auth Guard
- [ ] Roles Guard
- [ ] Rate Limiting (Throttler)
- [ ] Account lockout logic
- [ ] Decoradores @CurrentUser() y @Roles()
- [ ] Audit logging interceptor

### 🧪 Fase 5: Testing y Refinamiento
- [ ] Tests unitarios de AuthService
- [ ] Tests e2e de endpoints de auth
- [ ] Tests de guards y decoradores
- [ ] Documentación Swagger
- [ ] Validación de seguridad

---

## 🧪 Casos de Prueba Críticos

### Login
- ✅ Login exitoso con credenciales válidas
- ✅ Login fallido con email inexistente
- ✅ Login fallido con password incorrecta
- ✅ Login con cuenta desactivada (isActive: false)
- ✅ Bloqueo de cuenta tras 5 intentos fallidos
- ✅ Rate limiting bloquea tras 5 intentos en 15min

### Tokens
- ✅ Access Token válido permite acceso
- ✅ Access Token expirado es rechazado
- ✅ Refresh Token válido genera nuevo Access Token
- ✅ Refresh Token expirado es rechazado
- ✅ Refresh Token revocado no puede usarse
- ✅ Logout invalida Refresh Token en BD

### Cookies
- ✅ Cookies tienen flag httpOnly
- ✅ Cookies tienen flag secure en producción
- ✅ Cookies tienen sameSite: strict
- ✅ Cookies se limpian en logout

### Autorización
- ✅ Endpoint protegido rechaza requests sin token
- ✅ Roles Guard permite acceso a roles autorizados
- ✅ Roles Guard bloquea acceso a roles no autorizados
- ✅ ADMIN puede acceder a endpoints de users
- ✅ DOCTOR no puede crear usuarios

---

## 📊 Respuestas de la API

### Login Exitoso

```json
HTTP/1.1 200 OK
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/
Set-Cookie: refresh_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh

{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@clinic.com",
    "role": "DOCTOR",
    "isActive": true
  },
  "message": "Login successful"
}
```

### Login Fallido

```json
HTTP/1.1 401 Unauthorized

{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Cuenta Bloqueada

```json
HTTP/1.1 403 Forbidden

{
  "statusCode": 403,
  "message": "Account locked due to multiple failed login attempts. Try again after 2026-01-27T15:30:00Z",
  "error": "Forbidden"
}
```

### Rate Limit Excedido

```json
HTTP/1.1 429 Too Many Requests

{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests"
}
```

---

## 🔒 Configuración de Cookies

```typescript
// Cookie options
const cookieOptions = {
  httpOnly: true,              // No accesible desde JavaScript
  secure: process.env.NODE_ENV === 'production',  // Solo HTTPS en prod
  sameSite: 'strict' as const, // Protección CSRF
  path: '/',                   // Disponible en toda la app
  maxAge: 15 * 60 * 1000,      // 15 minutos para access token
};
```

---

## 🚀 Cómo Usar el Sistema

### 1. Crear Usuario Inicial (Admin)

```bash
# Ejecutar script de seed
npm run prisma:seed

# O manualmente con Prisma Studio
npx prisma studio
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clinic.com",
    "password": "Admin123!"
  }' \
  -c cookies.txt
```

### 3. Acceder a Recurso Protegido

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

---

## 📖 Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Generar Prisma Client
npx prisma generate

# Crear migración
npx prisma migrate dev --name add-auth-models

# Ver BD en navegador
npx prisma studio

# Ejecutar seed
npm run prisma:seed

# Tests
npm run test
npm run test:e2e
npm run test:cov

# Build para producción
npm run build
```

---

## 🔍 Troubleshooting

### Problema: "Invalid token signature"
**Solución:** Verifica que `JWT_SECRET` sea el mismo en todos los ambientes y no cambie entre reinicios.

### Problema: "Cookies no se envían"
**Solución:** Asegúrate de que el frontend y backend estén en el mismo dominio o configura CORS correctamente con `credentials: true`.

### Problema: "Account locked pero no debería"
**Solución:** Verifica que la zona horaria del servidor sea correcta. Usa `DateTime` UTC en Prisma.

### Problema: "Rate limit muy restrictivo"
**Solución:** Ajusta `RATE_LIMIT_MAX` y `RATE_LIMIT_TTL` en `.env` según tus necesidades.

---

## 🔐 Buenas Prácticas de Seguridad

### ✅ HACER
- Usar HTTPS en producción siempre
- Rotar `JWT_SECRET` periódicamente
- Implementar logging de auditoría completo
- Validar todas las entradas de usuario
- Mantener dependencias actualizadas
- Usar variables de entorno para secrets
- Implementar MFA para roles críticos

### ❌ NO HACER
- Nunca exponer tokens en URLs o logs
- No usar `JWT_SECRET` débil o predecible
- No deshabilitar CORS sin entender el riesgo
- No almacenar tokens en localStorage
- No enviar tokens en response body
- No confiar en datos del cliente sin validar

---

## 📚 Referencias

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Auth Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [HIPAA Compliance](https://www.hhs.gov/hipaa/index.html)

---

**Estado:** 🚧 En implementación activa  
**Última actualización:** 27 de enero de 2026  
**Mantenido por:** Healthcare API Team
