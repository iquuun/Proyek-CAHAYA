@echo off
title Kasir Cahaya Komputer Server
echo ==============================================================
echo              SISTEM KASIR CAHAYA KOMPUTER
echo ==============================================================
echo Menjalankan aplikasi untuk akses dari PC 2 dan HP...
echo.

:: Mengambil IP Lokal Komputer Utama (Otomatis)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do set IP=%%a
:: Menghapus spasi dari tulisan IP
set IP=%IP: =%

:: Menjalankan Backend Laravel di Window Baru (--host=0.0.0.0)
echo [1] Menyalakan Backend API (Database)...
cd api
start "Backend Kasir (JANGAN DITUTUP!)" cmd /k "title Backend Kasir - JANGAN DITUTUP! & echo BACKEND BERJALAN, JANGAN TUTUP JENDELA INI! & echo. & php artisan serve --host=0.0.0.0 --port=8000"
cd ..

:: Menjalankan Frontend React di Window Baru (--host)
echo [2] Menyalakan Tampilan Aplikasi...
start "Frontend Kasir (JANGAN DITUTUP!)" cmd /k "title Frontend Kasir - JANGAN DITUTUP! & echo FRONTEND BERJALAN, JANGAN TUTUP JENDELA INI! & echo. & npm run dev -- --host"

echo.
echo ==============================================================
echo SUKSES! SERVER TELAH BERJALAN.
echo Silakan buka alamat berikut di Google Chrome (PC 1 / PC 2 / HP):
echo.
echo    http://%IP%:5173
echo.
echo Syarat Wajib:
echo 1. PC 2 dan HP harus nyambung ke Wi-Fi / LAN yang sama dengan PC Utama.
echo 2. Jika muter-muter / loading terus, matikan sementara Windows Firewall di komputer ini.
echo ==============================================================
pause
