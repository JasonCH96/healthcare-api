# 🐳 Solución al Problema de Docker Desktop

## ❌ Error Actual
```
request returned 500 Internal Server Error for API route
```

Este error indica que Docker Desktop está teniendo problemas de comunicación interna.

## ✅ Solución Paso a Paso

### Opción 1: Reinicio Completo de Docker Desktop (Recomendado)

1. **Cierra Docker Desktop completamente:**
   - Haz clic derecho en el ícono de Docker en la bandeja del sistema (systray)
   - Selecciona "Quit Docker Desktop"
   - Espera 10-15 segundos

2. **Abre el Administrador de Tareas:**
   - Presiona `Ctrl + Shift + Esc`
   - Busca cualquier proceso que contenga "docker"
   - Si encuentras alguno, finalízalo

3. **Inicia Docker Desktop nuevamente:**
   - Busca "Docker Desktop" en el menú de inicio
   - Ábrelo y espera a que cargue completamente
   - Deberías ver "Docker Desktop is running" en el ícono

4. **Verifica que funciona:**
   ```powershell
   docker ps
   ```

5. **Inicia los servicios:**
   ```powershell
   docker compose up -d
   ```

### Opción 2: Reinicio de Windows (Si la Opción 1 no funciona)

Si Docker Desktop sigue con problemas, a veces un reinicio completo de Windows resuelve problemas de servicios:

1. Reinicia tu computadora
2. Inicia Docker Desktop
3. Ejecuta los comandos de docker

### Opción 3: Reinstalación de Docker Desktop (Último Recurso)

Si nada funciona:

1. Desinstala Docker Desktop desde "Configuración > Aplicaciones"
2. Descarga la última versión desde: https://www.docker.com/products/docker-desktop/
3. Instala Docker Desktop
4. Reinicia tu computadora

## 🚀 Una vez que Docker funcione

Ejecuta estos comandos en orden:

```powershell
# 1. Verificar que Docker está funcionando
docker ps

# 2. Iniciar servicios
docker compose up -d

# 3. Verificar que los contenedores están corriendo
docker compose ps

# 4. Ver logs si hay algún problema
docker compose logs

# 5. Aplicar migraciones de base de datos
npx prisma migrate dev --name add-auth-models

# 6. Poblar base de datos con usuarios de prueba
npx prisma db seed

# 7. Iniciar la aplicación
npm run start:dev
```

## 🔍 Verificar Estado de los Contenedores

```powershell
# Ver contenedores en ejecución
docker compose ps

# Ver logs de la base de datos
docker compose logs db

# Conectarse a la base de datos
docker compose exec db psql -U postgres -d healthcare_db
```

## 📊 Estado Esperado

Cuando todo funcione correctamente, deberías ver:

```
NAME              IMAGE         COMMAND                  STATUS        PORTS
healthcare-api    ...           "docker-entrypoint.s…"   Up           0.0.0.0:3000->3000/tcp
healthcare-db     postgres:16   "docker-entrypoint.s…"   Up           0.0.0.0:5432->5432/tcp
```

## 🆘 Si Sigues Teniendo Problemas

Si después de reiniciar Docker Desktop el problema persiste, puedes:

1. **Usar PostgreSQL local:** Instala PostgreSQL directamente en Windows
   - Descarga desde: https://www.postgresql.org/download/windows/
   - Actualiza el `DATABASE_URL` en tu `.env`
   
2. **Verificar recursos:** Docker Desktop requiere:
   - Hyper-V habilitado (Windows Pro)
   - WSL 2 instalado
   - Al menos 4GB de RAM disponible
   - Virtualización habilitada en BIOS

3. **Revisar configuración de Docker Desktop:**
   - Abre Docker Desktop
   - Ve a Settings > Resources
   - Asegúrate de tener suficiente RAM y CPU asignados

## 📝 Notas Importantes

- El error 500 en la API de Docker generalmente se debe a que el servicio de Docker no está respondiendo correctamente
- NO es un problema con tu código o configuración
- Es un problema temporal con Docker Desktop que se resuelve reiniciando
