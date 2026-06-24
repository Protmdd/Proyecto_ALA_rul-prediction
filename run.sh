#!/bin/bash

# run.sh - Ejecuta Backend + Frontend en Linux/Mac con un comando
# Uso: bash run.sh

cat << "EOF"

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 RUL PREDICTION SAAS - STARTUP COMPLETO                      ║
║   Ejecutando Backend + Frontend con un comando                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

EOF

echo "📋 Verificando dependencias..."
echo ""

# 1. Backend dependencies
echo "1️⃣  Backend - Instalando dependencias..."
cd backend
pip install -q -r requirements.txt > /dev/null 2>&1
echo "   ✅ Backend dependencies OK"

# 2. Generate demo data
echo ""
echo "2️⃣  Generando datos demo (12 rodamientos)..."
python procesar_datos.py > /dev/null 2>&1
echo "   ✅ Datos demo generados"
cd ..

# 3. Frontend dependencies
echo ""
echo "3️⃣  Frontend - Instalando dependencias..."
cd frontend
npm install --quiet > /dev/null 2>&1
echo "   ✅ Frontend dependencies OK"
cd ..

cat << "EOF"

╔════════════════════════════════════════════════════════════════════╗
║   🚀 INICIANDO SERVICIOS...                                       ║
╚════════════════════════════════════════════════════════════════════╝

EOF

# 4. Start backend in background
echo "🔧 Backend (FastAPI) - http://localhost:8000"
cd backend
python main.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# 5. Start frontend
echo "⚛️  Frontend (React) - http://localhost:3000"
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

cat << "EOF"

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ✅ SERVICIOS INICIADOS                                          ║
║                                                                    ║
║   🌐 Frontend: http://localhost:3000                             ║
║   🔌 API:      http://localhost:8000                             ║
║   📚 Docs:     http://localhost:8000/docs                        ║
║                                                                    ║
║   Presiona Ctrl+C para detener                                   ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

EOF

# Wait for Ctrl+C
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e "\n\n🛑 Servicios detenidos"; exit 0' SIGINT
wait
