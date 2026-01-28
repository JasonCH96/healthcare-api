# Instrucciones para GitHub Copilot

## 1. Información General del Proyecto

**Nombre:** Healthcare API

**Tipo:** Backend REST API - Sistema Enterprise de Gestión Clínica

**Dominio:** Salud / Clínica / Centro Médico

**Nivel:** Enterprise (producción real)

**Estado:** En desarrollo activo

---

## 2. Objetivo del Sistema

Desarrollar un **backend robusto, escalable y seguro** para la gestión integral de una clínica o centro médico que permita administrar:

- Usuarios y roles (ADMIN, DOCTOR, STAFF, PATIENT)
- Pacientes y su historial médico
- Doctores y especialidades
- Citas médicas
- Autenticación y autorización basada en JWT
- Escalabilidad futura (multi-clínica)

**Importante:** Este sistema está diseñado para **uso real en producción**, no como demo o proyecto académico.

---

## 3. Stack Tecnológico

### Backend

- **Framework**: NestJS (arquitectura modular)
- **Runtime**: Node.js
- **Lenguaje**: TypeScript

### Base de Datos

- **Motor**: PostgreSQL 16
- **ORM**: Prisma ORM v7
  - Migraciones versionadas
  - Modelado de dominio robusto

### Infraestructura

- **Containerización**: Docker + Docker Compose
- **Testing**: Jest

### Estructura Prisma (v7)

```
prisma/
 ├─ schema.prisma    # Modelos y enums
 └─ migrations/      # Migraciones versionadas

prisma.config.ts     # Configuración de conexión
```

---

## 4. Estado Actual del Proyecto

### ✅ Completado

- **Infraestructura Docker**: Servicios `api` y `db` configurados
- **PostgreSQL 16**: Operativo con persistencia de datos
- **Prisma ORM v7**: Configuración moderna y funcional
- **Modelo de dominio inicial**:
  - Enum `Role`: ADMIN, DOCTOR, STAFF, PATIENT
  - Modelo `User`: ID UUID, email único, password hasheado, rol, timestamps
- **Primera migración ejecutada**: Base de datos sincronizada

### 🚧 En Roadmap

1. PrismaService en NestJS
2. Módulo Users (CRUD completo)
3. Módulo Auth (JWT, Guards por rol)
4. Módulos Patients y Doctors
5. Módulo Appointments (gestión de citas)
6. Tests unitarios y e2e
7. Preparación para producción

---

## 5. Requerimientos Funcionales Clave

### Gestión de Usuarios
- CRUD completo con roles
- Control de acceso por rol
- Activación/desactivación de usuarios

### Autenticación y Autorización
- Login con email/password
- JWT tokens
- Guards personalizados por rol
- Protección de endpoints sensibles

### Gestión de Pacientes
- Registro y actualización
- Historial médico básico
- Asociación con citas

### Gestión de Doctores
- Registro con especialidades
- Control de disponibilidad
- Relación con citas médicas

### Gestión de Citas
- Estados: PENDING, CONFIRMED, CANCELLED, COMPLETED
- Crear, reprogramar, cancelar
- Asociación paciente ↔ doctor

### Multi-Rol / Multi-Perfil
- **ADMIN**: Control total del sistema
- **DOCTOR**: Acceso a sus citas y pacientes
- **STAFF**: Gestión operativa
- **PATIENT**: Acceso limitado a sus propios datos

## Convenciones de Código

### Estructura de Archivos

- Usa módulos de NestJS para organizar funcionalidades
- Cada módulo debe tener: controller, service, module, y opcionalmente DTOs y entities
- Coloca los DTOs en carpetas `dto/` dentro de cada módulo
- Coloca las entities/interfaces en carpetas `entities/` o `interfaces/`

### Nomenclatura

- **Clases**: PascalCase (Ej: `UserService`, `PatientController`)
- **Archivos**: kebab-case (Ej: `user.service.ts`, `patient.controller.ts`)
- **Variables y funciones**: camelCase (Ej: `getUserById`, `patientData`)
- **Constantes**: UPPER_SNAKE_CASE (Ej: `MAX_RETRIES`, `API_VERSION`)
- **Interfaces**: PascalCase con prefijo `I` (Ej: `IUser`, `IPatient`)

### TypeScript

- Siempre usa tipos explícitos
- Evita el uso de `any`, prefiere `unknown` si es necesario
- Usa interfaces para objetos y types para uniones/intersecciones
- Habilita strict mode

### NestJS

- Usa decoradores de NestJS correctamente: `@Controller()`, `@Injectable()`, `@Get()`, etc.
- Implementa validación con `class-validator` y `class-transformer` en DTOs
- Usa `@ApiProperty()` de Swagger para documentar DTOs
- Maneja errores con excepciones de NestJS: `NotFoundException`, `BadRequestException`, etc.
- Usa inyección de dependencias para servicios
- Implementa pipes, guards e interceptors cuando sea apropiado

### Prisma

- Define modelos en `schema.prisma` siguiendo las convenciones de Prisma
- Usa relaciones adecuadas: `@relation`
- Genera cliente de Prisma después de cambios: `npx prisma generate`
- Usa transacciones para operaciones múltiples relacionadas
- Implementa manejo de errores específicos de Prisma

### API REST

- Sigue convenciones RESTful:
  - GET para lectura
  - POST para creación
  - PUT/PATCH para actualización
  - DELETE para eliminación
- Usa códigos de estado HTTP apropiados
- Implementa paginación para listados
- Usa query parameters para filtros y búsquedas

### Seguridad

- Nunca expongas información sensible en logs o respuestas
- Valida y sanitiza todas las entradas de usuario
- Implementa autenticación y autorización adecuadas
- Usa variables de entorno para configuraciones sensibles
- Datos médicos deben cumplir con HIPAA/GDPR según corresponda

### Testing

- Escribe tests unitarios para servicios
- Escribe tests e2e para endpoints críticos
- Mock dependencias externas en tests
- Usa factories o builders para datos de test
- Asegura cobertura de código adecuada

### Docker

- El Dockerfile debe ser multi-stage para optimizar tamaño
- No incluyas archivos de desarrollo en la imagen final
- Usa .dockerignore apropiadamente

## Patrones Comunes

### Estructura de un Controlador

```typescript
@Controller('resource')
@ApiTags('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  findAll(@Query() query: QueryDto) {
    return this.resourceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by id' })
  findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create resource' })
  create(@Body() createDto: CreateResourceDto) {
    return this.resourceService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resource' })
  update(@Param('id') id: string, @Body() updateDto: UpdateResourceDto) {
    return this.resourceService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource' })
  remove(@Param('id') id: string) {
    return this.resourceService.remove(id);
  }
}
```

### Estructura de un Servicio

```typescript
@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDto) {
    return this.prisma.resource.findMany({
      where: query.filter,
      skip: query.skip,
      take: query.take,
    });
  }

  async findOne(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });
    
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    
    return resource;
  }

  async create(createDto: CreateResourceDto) {
    return this.prisma.resource.create({
      data: createDto,
    });
  }

  async update(id: string, updateDto: UpdateResourceDto) {
    await this.findOne(id); // Verify exists
    
    return this.prisma.resource.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verify exists
    
    return this.prisma.resource.delete({
      where: { id },
    });
  }
}
```

### DTOs con Validación

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ description: 'Resource name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Resource description' })
  @IsString()
  @IsOptional()
  description?: string;
}
```

## Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Prisma
npx prisma generate
npx prisma migrate dev
npx prisma studio

# Testing
npm run test
npm run test:e2e
npm run test:cov

# Build
npm run build

# Docker
docker-compose up -d
docker-compose down
```

## Mejores Prácticas

1. **Separación de responsabilidades**: Controllers manejan HTTP, Services contienen lógica de negocio
2. **Validación temprana**: Valida datos en DTOs antes de procesarlos
3. **Manejo de errores consistente**: Usa excepciones de NestJS
4. **Logging apropiado**: Log errores y eventos importantes
5. **Documentación**: Usa decoradores de Swagger para documentar APIs
6. **Tipos fuertes**: Aprovecha TypeScript al máximo
7. **Código limpio**: Funciones pequeñas, nombres descriptivos, evita duplicación

## Consideraciones Healthcare

- Los datos de pacientes son **altamente sensibles**
- Implementa auditoría de acceso a datos médicos
- Encripta datos sensibles en reposo y en tránsito
- Cumple con regulaciones (HIPAA, GDPR, etc.)
- Implementa control de acceso basado en roles (RBAC)
- Mantén logs de auditoría para acciones críticas
