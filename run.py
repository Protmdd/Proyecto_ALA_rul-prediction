#!/usr/bin/env python3
"""
run.py - Ejecuta Backend + Frontend con UN SOLO COMANDO

Uso:
    python run.py
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def run_command(cmd, cwd=None, name=""):
    """Ejecuta comando en proceso separado"""
    print(f"\n{'='*70}")
    print(f"▶️  {name}")
    print(f"{'='*70}\n")
    
    try:
        if sys.platform == "win32":
            subprocess.Popen(cmd, shell=True, cwd=cwd)
        else:
            subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 RUL PREDICTION SAAS - STARTUP COMPLETO                      ║
║   Ejecutando Backend + Frontend con un comando                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)
    
    root = Path(__file__).parent
    backend_path = root / "backend"
    frontend_path = root / "frontend"
    
    # Check paths
    if not backend_path.exists() or not frontend_path.exists():
        print("❌ Estructura incorrecta. Asegúrate de estar en la carpeta raíz.")
        sys.exit(1)
    
    print("📋 Verificando dependencias...\n")
    
    # 1. Instalar backend
    print("1️⃣  Backend - Instalando dependencias...")
    cmd = f"cd backend && pip install -q -r requirements.txt"
    result = subprocess.run(cmd, shell=True, capture_output=True)
    if result.returncode == 0:
        print("   ✅ Backend dependencies OK")
    else:
        print("   ❌ Error instalando backend. Asegúrate de tener Python 3.10+")
        sys.exit(1)
    
    # 2. Generar datos demo
    print("\n2️⃣  Generando datos demo (12 rodamientos)...")
    cmd = f"cd backend && python procesar_datos.py"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if "✅ Datos DEMO generados" in result.stdout or result.returncode == 0:
        print("   ✅ Datos demo generados")
    else:
        print("   ⚠️  Error generando datos (pero continuamos)")
    
    # 3. Instalar frontend
    print("\n3️⃣  Frontend - Instalando dependencias...")
    cmd = f"cd frontend && npm install --quiet"
    result = subprocess.run(cmd, shell=True, capture_output=True)
    if result.returncode == 0:
        print("   ✅ Frontend dependencies OK")
    else:
        print("   ❌ Error instalando frontend. Asegúrate de tener Node.js 18+")
        sys.exit(1)
    
    print("\n" + "="*70)
    print("🚀 INICIANDO SERVICIOS...\n")
    print("="*70)
    
    # 4. Start backend
    if sys.platform == "win32":
        cmd_backend = "cd backend && python main.py"
        run_command(cmd_backend, name="🔧 Backend (FastAPI) - http://localhost:8000")
    else:
        cmd_backend = "cd backend && python main.py"
        run_command(cmd_backend, name="🔧 Backend (FastAPI) - http://localhost:8000")
    
    # Wait for backend to start
    time.sleep(3)
    
    # 5. Start frontend
    if sys.platform == "win32":
        cmd_frontend = "cd frontend && npm run dev"
        run_command(cmd_frontend, name="⚛️  Frontend (React) - http://localhost:3000")
    else:
        cmd_frontend = "cd frontend && npm run dev"
        run_command(cmd_frontend, name="⚛️  Frontend (React) - http://localhost:3000")
    
    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ✅ SERVICIOS INICIADOS                                          ║
║                                                                    ║
║   🌐 Frontend: http://localhost:3000                             ║
║   🔌 API:      http://localhost:8000                             ║
║   📚 Docs:     http://localhost:8000/docs                        ║
║                                                                    ║
║   🎨 Presiona Ctrl+C para detener                                ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Deteniendo servicios...")
        sys.exit(0)

if __name__ == "__main__":
    main()
