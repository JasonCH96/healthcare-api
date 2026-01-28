# Healthcare API - Setup Script
# Este script configura la base de datos y la aplicación

Write-Host "🏥 Healthcare API - Setup Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificar Docker
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker está funcionando`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker no está funcionando" -ForegroundColor Red
    Write-Host "   Por favor, inicia Docker Desktop y ejecuta este script nuevamente" -ForegroundColor Yellow
    exit 1
}

# Iniciar servicios
Write-Host "🚀 Iniciando servicios Docker..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar servicios Docker" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Servicios iniciados`n" -ForegroundColor Green

# Esperar a que la base de datos esté lista
Write-Host "⏳ Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar servicios
Write-Host "`n📊 Estado de los contenedores:" -ForegroundColor Yellow
docker compose ps

# Generar cliente Prisma
Write-Host "`n🔧 Generando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar cliente Prisma" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Cliente Prisma generado`n" -ForegroundColor Green

# Aplicar migraciones
Write-Host "🗃️  Aplicando migraciones de base de datos..." -ForegroundColor Yellow
npx prisma migrate dev --name add-auth-models
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al aplicar migraciones" -ForegroundColor Red
    Write-Host "   Verifica que la base de datos esté accesible" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Migraciones aplicadas`n" -ForegroundColor Green

# Ejecutar seed
Write-Host "🌱 Poblando base de datos con datos iniciales..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Error al ejecutar seed" -ForegroundColor Yellow
    Write-Host "   Puedes ejecutarlo manualmente con: npx prisma db seed" -ForegroundColor Yellow
} else {
    Write-Host "✅ Base de datos poblada`n" -ForegroundColor Green
}

# Resumen
Write-Host "`n✨ ¡Setup completado!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "📋 Credenciales de prueba:" -ForegroundColor Yellow
Write-Host "   Admin:  admin@clinic.com   / Admin123!" -ForegroundColor White
Write-Host "   Doctor: doctor@clinic.com  / Doctor123!" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para iniciar la aplicación:" -ForegroundColor Yellow
Write-Host "   npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 Endpoints disponibles:" -ForegroundColor Yellow
Write-Host "   POST http://localhost:3000/auth/login" -ForegroundColor White
Write-Host "   POST http://localhost:3000/auth/me" -ForegroundColor White
Write-Host "   POST http://localhost:3000/auth/logout" -ForegroundColor White
Write-Host "   GET  http://localhost:3000/users" -ForegroundColor White
Write-Host ""
