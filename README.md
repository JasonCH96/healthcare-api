# CitaBox API

API de la demo clínica construida con NestJS, Prisma y PostgreSQL. Incluye agenda, pacientes, expediente, recetas, cobros manuales, portal del paciente y solicitudes públicas de cita. La facturación electrónica y las notificaciones automáticas aún no están integradas.

## Demo local en Windows, sin Docker

Requisitos: Node.js, npm y Chrome o Edge para generar los PDF. Desde `healthcare-api`:

```powershell
npm ci
npm run demo:db
```

Mantén esa terminal abierta. La primera vez, en otra terminal del mismo directorio:

```powershell
npm run demo:prepare
npm run demo:api
```

`demo:db` inicia PostgreSQL local en `127.0.0.1:5433` y crea `.env.demo` con credenciales aleatorias. `demo:prepare` aplica las migraciones y carga datos ficticios; solo es necesario al crear la base o después de cambios en los datos de ejemplo. Los datos se conservan en `.demo-db/`, ignorado por Git. En arranques posteriores, inicia `demo:db` y `demo:api`.

En una tercera terminal, desde `healthcare-web`:

```powershell
npm ci
npm run dev
```

Abre `http://localhost:3000`. La API responde en `http://localhost:3001`. El frontend usa esa URL por defecto; si cambias el puerto, configura `NEXT_PUBLIC_API_URL` en un archivo `.env.local` dentro de `healthcare-web`.

## Accesos ficticios

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@clinica.cr` | `admin123` |
| Recepción | `staff@clinica.cr` | `staff123` |
| Médico | `doctor@clinica.cr` | `doctor123` |
| Portal del paciente | Cédula `1-1000-0001` | `Paciente123` |

Selecciona **Clinica Demo** tras iniciar sesión. La reserva pública está en `http://localhost:3000/book/clinica-demo` y el portal en `http://localhost:3000/portal/clinica-demo`.
La ruta corta `/book` redirige a la clínica de ejemplo; puedes cambiarla con `DEFAULT_BOOKING_CLINIC_SLUG` en el frontend.

## Verificación

Con la base local en ejecución:

```powershell
npm test -- --runInBand
npx dotenv -e .env.demo -- npm run test:e2e -- --runInBand
npm run build
```

En `healthcare-web`, con ambos servidores activos:

```powershell
npx playwright install chromium
npm run test:e2e
npm run build
```

Usa solo datos ficticios en esta demo. Las reservas públicas crean solicitudes `PENDING` para que la clínica las revise; el recordatorio descargable señala ese estado. Los pagos son registros manuales y no procesan dinero real.
