# run.ps1 - Ejecuta Backend + Frontend en Windows con un comando
# Uso: PowerShell -ExecutionPolicy Bypass -File run.ps1

Write-Host @"
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 RUL PREDICTION SAAS - STARTUP COMPLETO                      ║
║   Ejecutando Backend + Frontend con un comando                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`n📋 Verificando dependencias...`n"

# 1. Backend dependencies
Write-Host "1️⃣  Backend - Instalando dependencias..." -ForegroundColor Yellow
Push-Location backend
pip install -q -r requirements.txt
Write-Host "   ✅ Backend dependencies OK" -ForegroundColor Green

# 2. Generate demo data
Write-Host "`n2️⃣  Generando datos demo (12 rodamientos)..." -ForegroundColor Yellow
python procesar_datos.py | Out-Null
Write-Host "   ✅ Datos demo generados" -ForegroundColor Green
Pop-Location

# 3. Frontend dependencies
Write-Host "`n3️⃣  Frontend - Instalando dependencias..." -ForegroundColor Yellow
Push-Location frontend
npm install --quiet
Write-Host "   ✅ Frontend dependencies OK" -ForegroundColor Green
Pop-Location

Write-Host @"

╔════════════════════════════════════════════════════════════════════╗
║   🚀 INICIANDO SERVICIOS...                                       ║
╚════════════════════════════════════════════════════════════════════╝

Abriendo nuevas ventanas de Terminal...

"@ -ForegroundColor Green

# 4. Start backend in new window
Write-Host "🔧 Backend (FastAPI) - http://localhost:8000" -ForegroundColor Cyan
Start-Process PowerShell -ArgumentList "-NoExit -Command `"cd '$PWD\backend' ; python main.py`""

# 5. Start frontend in new window
Start-Sleep -Seconds 3
Write-Host "⚛️  Frontend (React) - http://localhost:3000" -ForegroundColor Cyan
Start-Process PowerShell -ArgumentList "-NoExit -Command `"cd '$PWD\frontend' ; npm run dev`""

Write-Host @"

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ✅ SERVICIOS INICIADOS EN NUEVAS VENTANAS                       ║
║                                                                    ║
║   🌐 Frontend: http://localhost:3000                             ║
║   🔌 API:      http://localhost:8000                             ║
║   📚 Docs:     http://localhost:8000/docs                        ║
║                                                                    ║
║   Cierra las ventanas para detener los servicios                 ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

# Keep main window open
Write-Host "`nPresiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
