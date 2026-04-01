@echo off
chcp 65001 >nul
title Kasir Cahaya Komputer Server
color 0B

echo ==============================================================
echo              SISTEM KASIR CAHAYA KOMPUTER
echo ==============================================================
echo.
echo Menjalankan aplikasi untuk akses dari PC 2 dan HP...
echo.

:: Simpan path folder utama project
set "PROJECT_DIR=%~dp0"

:: Mengambil IP Lokal Komputer Utama (cari yang pertama saja)
set IP=127.0.0.1
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    if "!IP!"=="127.0.0.1" (
        set "IP=%%a"
    )
)
:: Fallback: jika delayed expansion tidak aktif, coba cara sederhana
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do set IP=%%a
:: Menghapus spasi di depan
for /f "tokens=*" %%b in ("%IP%") do set IP=%%b

echo IP Server terdeteksi: %IP%
echo.

:: ============================================================
:: 1. Menjalankan Backend Laravel (PHP artisan serve)
:: ============================================================
echo [1/2] Menyalakan Backend API (Database)...
start "Backend Kasir" cmd /k "title Backend Kasir - JANGAN DITUTUP! & color 0A & cd /d "%PROJECT_DIR%api" & echo. & echo ============================== & echo   BACKEND BERJALAN (port 8000) & echo   JANGAN TUTUP JENDELA INI! & echo ============================== & echo. & php artisan serve --host=0.0.0.0 --port=8000"

:: Tunggu backend siap dulu (5 detik)
echo    Menunggu backend siap...
timeout /t 5 /nobreak >nul

:: ============================================================
:: 2. Menjalankan Frontend React (Vite dev server)
:: ============================================================
echo [2/2] Menyalakan Tampilan Aplikasi...
start "Frontend Kasir" cmd /k "title Frontend Kasir - JANGAN DITUTUP! & color 0E & cd /d "%PROJECT_DIR%" & echo. & echo =============================== & echo   FRONTEND BERJALAN (port 5173) & echo   JANGAN TUTUP JENDELA INI! & echo =============================== & echo. & npx vite --host"

:: Tunggu frontend siap (8 detik)
echo    Menunggu frontend siap...
timeout /t 8 /nobreak >nul

:: ============================================================
:: 3. Buka browser otomatis
:: ============================================================
echo.
echo ==============================================================
echo   SUKSES! SEMUA SERVER TELAH BERJALAN.
echo ==============================================================
echo.
echo   Buka di PC ini  :  http://127.0.0.1:5173
echo   Buka di PC 2/HP :  http://%IP%:5173
echo.
echo   Syarat: Semua perangkat harus di Wi-Fi / LAN yang sama.
echo   Jika gagal: matikan Windows Firewall sementara.
echo ==============================================================
echo.

:: Buka browser ke 127.0.0.1 (bukan localhost, agar IPv4)
start http://127.0.0.1:5173

echo Tekan tombol apa saja untuk menutup jendela ini (server tetap jalan)...
pause >nul
