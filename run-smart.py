#!/usr/bin/env python3
"""
run-smart.py - Inicia Backend + Frontend
Automáticamente detecta si necesita instalar dependencias
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def check_dependencies():
    """Verifica si las dependencias ya están instaladas"""
    # Check Python packages
    try:
        import fastapi
        import sqlalchemy
        backend_ok = True
    except ImportError:
        backend_ok = False
    
    # Check Node packages
    frontend_path = Path("frontend/node_modules")
    frontend_ok = frontend_path.exists() and (frontend_path / "react").exists()
    
    return backend_ok, frontend_ok

def install_dependencies():
    """Instala dependencias (compatible con Windows, Linux y Mac)."""
    print("📦 Instalando dependencias (primera vez)...\n")
    print("   Nota: TensorFlow es grande (~400 MB), la primera vez puede tardar.\n")

    print("  Backend...")
    # En Windows pip funciona sin flags especiales; en Linux gestionado a veces
    # hace falta --break-system-packages. Se intenta primero el modo estándar.
    r = subprocess.run("cd backend && pip install -q -r requirements.txt", shell=True)
    if r.returncode != 0:
        subprocess.run(
            "cd backend && pip install -q --break-system-packages -r requirements.txt",
            shell=True,
        )

    print("  Frontend...")
    subprocess.run("cd frontend && npm install --quiet", shell=True)

    print("✅ Dependencias instaladas\n")


def procesar_datos():
    """Procesa el dataset IMS si está presente."""
    import os
    ims_dir = os.path.join("backend", "data", "IMS")
    db_file = os.path.join("backend", "rul_database.db")

    if os.path.exists(db_file):
        print("  Base de datos ya existe, omitiendo procesamiento.\n")
        return

    if os.path.isdir(ims_dir) and any(os.scandir(ims_dir)):
        print("  Procesando dataset IMS y entrenando la red neuronal...")
        print("  (lee los archivos, extrae features, entrena el modelo y predice)")
        print("  Tiempo aprox: 5-10 min. Ajusta velocidad con PASO_LECTURA.\n")
        subprocess.run("cd backend && python procesar_datos.py", shell=True)
        print("✅ Datos procesados y modelo entrenado\n")
    else:
        print("\n  ⚠️  No se encontró el dataset IMS en backend/data/IMS/")
        print("     Coloca las carpetas 1st_test / 2nd_test / 3rd_test ahí")
        print("     y vuelve a ejecutar, o corre 'python procesar_datos.py'")
        print("     manualmente dentro de backend/.\n")

def start_services():
    """Inicia Backend + Frontend"""
    print("\n🚀 Iniciando servicios...\n")
    
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

def main():
    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 RUL PREDICTION SAAS - SMART START                           ║
║   (Instala solo si es necesario)                                  ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)
    
    print("🔍 Detectando dependencias...\n")
    backend_ok, frontend_ok = check_dependencies()
    
    if not backend_ok or not frontend_ok:
        print(f"  Backend: {'✅' if backend_ok else '❌'}")
        print(f"  Frontend: {'✅' if frontend_ok else '❌'}\n")
        install_dependencies()
    else:
        print("  Backend: ✅")
        print("  Frontend: ✅")
        print("  (Saltando instalación, ya está todo listo)\n")
    
    procesar_datos()
    start_services()
    
    print("""
╔════════════════════════════════════════════════════════════════════╗
║   ✅ SERVICIOS INICIADOS                                          ║
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
