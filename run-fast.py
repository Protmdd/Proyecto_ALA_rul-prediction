#!/usr/bin/env python3
"""
run-fast.py - Inicia Backend + Frontend (asume dependencias ya instaladas)
Uso: python run-fast.py
"""

import subprocess
import sys
import time
from pathlib import Path

def main():
    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 RUL PREDICTION SAAS - FAST START (sin reinstalar)           ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)
    
    print("🔧 Backend (FastAPI) - http://localhost:8000")
    if sys.platform == "win32":
        subprocess.Popen("cmd /c cd backend && python main.py", shell=True)
    else:
        subprocess.Popen("cd backend && python main.py", shell=True)
    
    time.sleep(2)
    
    print("⚛️  Frontend (React) - http://localhost:3000")
    if sys.platform == "win32":
        subprocess.Popen("cmd /c cd frontend && npm run dev", shell=True)
    else:
        subprocess.Popen("cd frontend && npm run dev", shell=True)
    
    print("""
╔════════════════════════════════════════════════════════════════════╗
║   ✅ SERVICIOS INICIADOS (sin reinstalar dependencias)            ║
║                                                                    ║
║   🌐 Frontend: http://localhost:3000                             ║
║   🔌 API:      http://localhost:8000                             ║
║   📚 Docs:     http://localhost:8000/docs                        ║
║                                                                    ║
║   Presiona Ctrl+C para detener                                   ║
╚════════════════════════════════════════════════════════════════════╝
    """)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo...")
        sys.exit(0)

if __name__ == "__main__":
    main()
