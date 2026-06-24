@echo off
echo ============================================================
echo    RUL PREDICTION SAAS - SETUP AUTOMATICO (Windows)
echo ============================================================
echo.

echo [1/4] Instalando dependencias backend...
cd backend
pip install -r requirements.txt
cd ..
echo.

echo [2/4] Generando datos demo...
cd backend
python procesar_datos.py
cd ..
echo.

echo [3/4] Instalando dependencias frontend...
cd frontend
call npm install
cd ..
echo.

echo ============================================================
echo    SETUP COMPLETADO
echo ============================================================
echo.
echo PARA EJECUTAR:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     python main.py
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Abrir: http://localhost:3000
echo ============================================================
pause
