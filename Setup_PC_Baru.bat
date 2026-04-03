@echo off
chcp 65001 >nul
title Setup Server Kasir di PC Baru
color 0B

echo ==============================================================
echo        SETUP OTOMATIS SERVER KASIR PC BARU
echo ==============================================================
echo.
echo Skrip ini akan melakukan:
echo 1. Menginstal Node.js (untuk Frontend React)
echo 2. Menginstal PHP (untuk Backend Laravel / Database SQLite)
echo 3. Menginstal Composer (Manajer paket PHP)
echo 4. Menginstal library project (npm install ^& composer install)
echo.
echo PENTING: Bawa seluruh folder "Kasir System Cahaya Komputer" ke PC 1.
echo PASTIKAN PC BARU INI TERHUBUNG KE INTERNET.
echo.
pause

:: Cek apakah winget tersedia (seharusnya ada di W10/W11 Terbaru)
where winget >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 'winget' tidak ditemukan. Sistem operasi PC ini mungkin versi lama.
    echo Harap install Node.js, PHP, dan Composer secara manual dengan mendownload dari webnya.
    pause
    exit /b
)

echo.
echo ==============================================================
echo 1/3 - MENGECEK DAN MENGINSTAL NODE.JS
echo ==============================================================
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js belum terpasang. Mengunduh dan menginstal melalui Winget...
    winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements --silent
    echo.
    echo [INFO] Node.js telah diinstal.
) else (
    echo [OK] Node.js sudah terinstal.
)

echo.
echo ==============================================================
echo 2/3 - MENGECEK DAN MENGINSTAL PHP
echo ==============================================================
where php >nul 2>nul
if %errorlevel% neq 0 (
    echo PHP belum terpasang. Mengunduh dan menginstal melalui Winget...
    winget install PHP.PHP -e --accept-source-agreements --accept-package-agreements --silent
    echo.
    echo [INFO] PHP telah diinstal.
) else (
    echo [OK] PHP sudah terinstal.
)

echo.
echo ==============================================================
echo 3/3 - MENGECEK DAN MENGINSTAL COMPOSER
echo ==============================================================
where composer >nul 2>nul
if %errorlevel% neq 0 (
    echo Composer belum terpasang. Mengunduh dan menginstal melalui Winget...
    winget install Composer.Composer -e --accept-source-agreements --accept-package-agreements --silent
    echo.
    echo [INFO] Composer telah diinstal.
) else (
    echo [OK] Composer sudah terinstal.
)

:: Evaluasi apakah butuh restart (jika baru saja menginstal)
echo.
echo ==============================================================
echo CEK RESTART...
echo ==============================================================
echo Jika tadi ada instalasi baru (Node.js/PHP/Composer), MUNGKIN sistem
echo butuh RESTART atau TUTUP-BUKA jendela ini agar bisa terbaca command prompt.
echo.
echo Apakah Anda ingin lanjut menginstal dependensi Aplikasi (NPM ^& Composer) sekarang?
echo (Jika nanti gagal / command not found, tutup jendela ini, RESTART PC, lalu ulangi).
echo.
pause

echo.
echo ==============================================================
echo MENGINSTAL DEPENDENSI PROJECT (Harap bersabar...)
echo ==============================================================

echo.
echo - Menginstal NPM Packages (Frontend React)...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [!] PERINGATAN: `npm install` gagal. Silakan RESTART komputer lalu jalankan lagi script ini.
) else (
    echo [OK] NPM Install sukses.
)

echo.
echo - Menginstal Composer Packages (Backend Laravel)...
cd /d "%~dp0api"
call composer install
if %errorlevel% neq 0 (
    echo [!] PERINGATAN: `composer install` gagal. Silakan RESTART komputer lalu jalankan lagi script ini.
) else (
    echo [OK] Composer Install sukses.
)
cd /d "%~dp0"

echo.
echo ==============================================================
echo SETUP SELESAI!
echo ==============================================================
echo Jika semua tulisan di atas aman tanpa ERROR, server sudah siap!
echo.
echo Langkah selanjutnya:
echo Anda tinggal dobel-klik file "Mulai_Server_Lokal.bat" seperti biasa.
echo.
pause
