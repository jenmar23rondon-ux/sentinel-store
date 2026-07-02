@echo off
setlocal

title Aether

cd /d "%~dp0"

echo.
echo ==========================================
echo   Aether - Personal Second Brain
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en PATH.
  echo Descargalo desde https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm no esta instalado o no esta en PATH.
  pause
  exit /b 1
)

if not exist "backend\.env" (
  echo [INFO] Creando backend\.env desde .env.example...
  copy ".env.example" "backend\.env" >nul
)

if not exist "node_modules" (
  echo [INFO] Instalando dependencias. Esto puede tardar unos minutos...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fallo.
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "$backend = Get-NetTCPConnection -LocalPort 4100 -ErrorAction SilentlyContinue; $frontend = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue; if ($backend -and $frontend) { exit 20 } elseif ($backend -or $frontend) { exit 21 } else { exit 0 }"
if %errorlevel%==20 (
  echo.
  echo [INFO] Aether ya parece estar corriendo.
  echo [INFO] Abriendo http://localhost:5173
  start "" "http://localhost:5173"
  pause
  exit /b 0
)
if %errorlevel%==21 (
  echo.
  echo [ERROR] Uno de los puertos necesarios ya esta ocupado.
  echo Cierra procesos en los puertos 4100 y 5173, o reinicia la terminal.
  echo.
  powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4100,5173 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess"
  pause
  exit /b 1
)

echo.
echo [INFO] Iniciando Aether...
echo [INFO] Frontend: http://localhost:5173
echo [INFO] Backend:  http://localhost:4100
echo.
echo Puedes cerrar esta ventana con Ctrl+C para detener la app.
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

call npm run dev

pause
