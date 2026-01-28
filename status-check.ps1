# Healthcare API - Status Check Script

Write-Host "🏥 Healthcare API - Status Check" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Docker Status
Write-Host "🐳 Docker Desktop:" -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✅ Running" -ForegroundColor Green
    
    Write-Host "`n📦 Contenedores:" -ForegroundColor Yellow
    docker compose ps
    
} catch {
    Write-Host "   ❌ Not running or not responding" -ForegroundColor Red
    Write-Host "   💡 Acción: Reinicia Docker Desktop" -ForegroundColor Yellow
}

# Database Connection
Write-Host "`n🗃️  Base de Datos:" -ForegroundColor Yellow
try {
    $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/healthcare_db"
    npx prisma db execute --stdin <<< "SELECT 1;" 2>&1 | Out-Null
    Write-Host "   ✅ Connected" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Not connected" -ForegroundColor Red
    Write-Host "   💡 Acción: Verifica que Docker esté corriendo" -ForegroundColor Yellow
}

# Prisma Client
Write-Host "`n🔧 Prisma Client:" -ForegroundColor Yellow
if (Test-Path "node_modules/@prisma/client") {
    Write-Host "   ✅ Generated" -ForegroundColor Green
} else {
    Write-Host "   ❌ Not generated" -ForegroundColor Red
    Write-Host "   💡 Acción: Ejecuta 'npx prisma generate'" -ForegroundColor Yellow
}

# Dependencies
Write-Host "`n📚 Dependencias:" -ForegroundColor Yellow
$packages = @(
    "@nestjs/jwt",
    "@nestjs/passport", 
    "passport-jwt",
    "cookie-parser",
    "bcrypt"
)

$allInstalled = $true
foreach ($package in $packages) {
    if (Test-Path "node_modules/$package") {
        Write-Host "   ✅ $package" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $package" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host "   💡 Acción: Ejecuta 'npm install'" -ForegroundColor Yellow
}

# Environment Variables
Write-Host "`n🔐 Variables de Entorno:" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env existe" -ForegroundColor Green
    
    $envContent = Get-Content .env -Raw
    $requiredVars = @("DATABASE_URL", "JWT_SECRET", "JWT_ACCESS_EXPIRATION", "JWT_REFRESH_EXPIRATION")
    
    foreach ($var in $requiredVars) {
        if ($envContent -match $var) {
            Write-Host "   ✅ $var configurado" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $var no encontrado" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ .env no existe" -ForegroundColor Red
    Write-Host "   💡 Acción: Copia .env.example a .env" -ForegroundColor Yellow
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 Resumen del Sistema`n" -ForegroundColor Cyan

$dockerOk = $false
try {
    docker ps | Out-Null
    $dockerOk = $true
} catch {}

if ($dockerOk -and (Test-Path "node_modules/@prisma/client") -and (Test-Path ".env")) {
    Write-Host "✅ Sistema listo para iniciar" -ForegroundColor Green
    Write-Host "   Ejecuta: npm run start:dev" -ForegroundColor White
} else {
    Write-Host "⚠️  Sistema requiere configuración" -ForegroundColor Yellow
    Write-Host "   Ejecuta: .\setup.ps1" -ForegroundColor White
}

Write-Host ""
