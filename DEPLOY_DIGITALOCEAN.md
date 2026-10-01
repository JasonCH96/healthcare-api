# Despliegue de CitaBox en DigitalOcean

El backend y PostgreSQL se ejecutan como servicios nativos en Ubuntu 24.04 del droplet `159.223.174.53`. El frontend permanece en Vercel. Este servidor ya tiene otras aplicaciones y un proxy Traefik compartido; CitaBox puede usar su ruta HTTPS mediante el proveedor de archivos, sin crear contenedores para la API ni para su base.

Estado al 1 de octubre de 2026: API y base instaladas; diez migraciones aplicadas; datos ficticios cargados con claves aleatorias; login, pacientes y PDF verificados en Linux. La ruta pública HTTPS y CORS esperan el dominio de la API y la URL confirmada de Vercel. El proxy compartido todavía no se ha modificado.

## Recursos y rutas

| Recurso | Configuración |
| --- | --- |
| Runtime | Node.js 22, PostgreSQL 16 |
| API interna | `http://172.18.0.1:3001`, accesible desde el proxy compartido |
| PostgreSQL | `127.0.0.1:5432`, base y usuario `citabox` |
| Servicio API | `citabox-api.service`, usuario sin privilegios `citabox` |
| Versiones | `/opt/citabox/releases/<commit>-<ejecución>-<intento>` |
| Versión activa | `/opt/citabox/current` |
| Variables privadas | `/etc/citabox/api.env`, propietario root, grupo citabox, modo 0640 |
| Cuenta SSH de CI | `citabox-deploy`, solo sudo para `citabox-activate` |
| Backups locales | `/var/backups/citabox`, cada día a las 03:00 de Costa Rica y antes de actualizar |

El droplet tiene 1 GB de RAM compartido con las otras aplicaciones. Las próximas compilaciones se harán en GitHub Actions. Los backups locales conservan siete días y protegen frente a errores de aplicación; configura una copia externa para protegerte frente a pérdida del droplet.

## GitHub Actions: variables y secretos que debes agregar

Repositorio: `JasonCH96/healthcare-api`. Ve a **Settings → Secrets and variables → Actions**, o usa las variables y secretos del environment **production**. El workflow utiliza ese environment.

| Tipo | Nombre exacto | Valor |
| --- | --- | --- |
| Secret | `DO_SSH_PRIVATE_KEY` | Contenido completo de `.deploy-secrets/github-actions-deploy`, desde BEGIN hasta END. Es una clave exclusiva para este deploy. |
| Secret | `DO_SSH_KNOWN_HOSTS` | Contenido completo de `.deploy-secrets/known_hosts`. Contiene la clave pública verificada del servidor. |
| Variable | `DO_HOST` | `159.223.174.53` (también es el valor por defecto del workflow) |
| Variable | `DO_SSH_USER` | `citabox-deploy` (valor por defecto) |
| Variable | `DO_SSH_PORT` | `22` (valor por defecto) |
| Variable | `API_URL` | `https://api.tudominio.com`, sin barra final. Obligatoria para verificar el HTTPS público. |

No hacen falta tokens de DigitalOcean, usuario root, contraseña de PostgreSQL ni JWT en GitHub. Las credenciales de la aplicación permanecen en el droplet. Los archivos `.deploy-secrets/` están ignorados por Git y contienen información privada; conserva la clave fuera de una carpeta compartida.

El archivo `.github/workflows/deploy-digitalocean.yml` ejecuta instalación, generación de Prisma, pruebas unitarias y compilación en cada pull request. Al subir cambios a `main`, o lanzar **Run workflow** sobre `main`, envía el artefacto y ejecuta migraciones antes de reiniciar. No ejecuta el seed ni borra datos. La conexión SSH exige la clave de host guardada; no utiliza `StrictHostKeyChecking=no`.

Si falla la salud de la API, restaura el enlace a la versión anterior del código. Las migraciones de base NO se deshacen: usa migraciones compatibles con la versión anterior, y revisa las migraciones que eliminan columnas antes de publicarlas.

## Backend: variables de entorno

Edita `/etc/citabox/api.env` por SSH. Debe tener formato compatible con shell y con systemd (valores simples o entre comillas). No cambies ni publiques las credenciales generadas. La plantilla pública está en `.env.production.example`.

| Nombre | Valor / propósito | Estado |
| --- | --- | --- |
| `NODE_ENV` | `production` | Configurada |
| `HOST` | `172.18.0.1`, gateway del proxy actual | Configurada |
| `PORT` | `3001` | Configurada |
| `DATABASE_URL` | URL privada PostgreSQL con usuario y contraseña aleatoria | Generada en el servidor |
| `JWT_SECRET` | Secreto aleatorio de 48 bytes | Generado en el servidor |
| `CORS_ORIGINS` | URL EXACTA de Vercel, por ejemplo `https://healthcare-web.vercel.app`; varios orígenes separados por coma, sin barra final | Pendiente de tu URL |
| `FRONTEND_URL` | URL pública estable del frontend, usada en las invitaciones | Pendiente de tu URL |
| `ENABLE_SWAGGER` | `false` | Configurada |
| `PUPPETEER_CACHE_DIR` | `/var/cache/citabox/puppeteer` | Configurada |

Variables opcionales para funcionalidades concretas:

| Funcionalidad | Variables |
| --- | --- |
| Adjuntos privados en DigitalOcean Spaces | `AWS_REGION` (región del Space), `AWS_S3_ENDPOINT` (`https://<region>.digitaloceanspaces.com`), `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| Invitaciones de equipo por correo | `RESEND_API_KEY`, `INVITE_FROM_EMAIL` (remitente de un dominio verificado) |
| Recordatorios por WhatsApp | `WHATSAPP_WEBHOOK_URL`, `WHATSAPP_WEBHOOK_TOKEN`; opcionales `WHATSAPP_WEBHOOK_AUTH_HEADER=Authorization`, `WHATSAPP_REQUEST_TIMEOUT_MS=10000` |
| Administradores globales por correo | `SUPER_ADMIN_EMAILS`, lista explícita separada por comas; no necesaria si el usuario ya tiene membresía SUPER_ADMIN |

Sin Spaces/S3, los adjuntos no se podrán subir. Sin Resend o webhook, sus envíos no se activan. Estos valores no se necesitan para arrancar la API y PostgreSQL.

## Vercel: variables que debes agregar

En el proyecto frontend, **Settings → Environment Variables**, agrega estas variables para Production y después vuelve a desplegar:

| Nombre | Valor |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.tudominio.com`, sin barra final ni `/api` |
| `DEFAULT_BOOKING_CLINIC_SLUG` | `clinica-demo`, o el slug que corresponda |

`NEXT_PUBLIC_API_URL` es una URL pública. No agregues JWT, contraseña de PostgreSQL o clave SSH al frontend. Para conectar previews, agrega cada origen concreto en `CORS_ORIGINS`; no uses `*`. La URL de la API debe tener HTTPS válido para que el navegador pueda llamarla desde Vercel.

## DNS y proxy HTTPS

Crea un registro DNS **A** para `api.tudominio.com` apuntando a `159.223.174.53`. No publiques el puerto 5432. El proxy compartido usa 80/443 y necesita añadir un proveedor de archivos con una ruta equivalente a `deploy/traefik-file.example.yml`. La configuración del gateway actual está en `/opt/apps/shared-gateway/compose.yaml`.

Después de configurar dominio, CORS y certificado:

```bash
curl --fail https://api.tudominio.com/health
# Respuesta esperada: {"status":"ok","database":"ok"}
```

## Primer acceso y datos ficticios

El despliegue normal solo aplica migraciones. El seed de demo es una operación separada y actualiza contraseñas si lo vuelves a ejecutar. En producción requiere contraseñas de al menos 12 caracteres para `MOCK_USER_PASSWORD`, `MOCK_PATIENT_PASSWORD`, `SUPER_ADMIN_PASSWORD`, `DEMO_ADMIN_PASSWORD`, `DEMO_DOCTOR_PASSWORD` y `DEMO_STAFF_PASSWORD`; ya no permite publicar `admin123`, `doctor123` o `staff123` por omisión.

Si se carga la demo, los accesos se guardan en `/etc/citabox/seed.env` (solo root). Los usuarios son `superadmin@citabox.app`, `admin@clinica.cr`, `doctor@clinica.cr` y `staff@clinica.cr`; el portal usa la cédula ficticia `1-1000-0001`.
El script `deploy/seed-demo.sh` genera esas contraseñas y se niega a ejecutar si ya existen clínicas en la base.

## Operación

```bash
sudo systemctl status citabox-api --no-pager
sudo journalctl -u citabox-api -n 100 --no-pager
sudo systemctl restart citabox-api
sudo systemctl list-timers citabox-backup.timer
sudo /usr/local/sbin/citabox-backup
```

No ejecutes `prisma migrate reset` en este servidor. Las actualizaciones usan `prisma migrate deploy` y las copias se hacen con `pg_dump`.

La auditoría de dependencias actual todavía reporta avisos altos y moderados en el árbol de producción; no tiene avisos críticos. Resolver esa deuda, completar los servicios externos y hacer una copia fuera del droplet son pasos pendientes antes de utilizar datos de pacientes reales.

Referencias: [secretos de GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [variables de Vercel](https://vercel.com/docs/environment-variables).
