<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\DistributorController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\CashFlowController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LaporanLabaController;
use App\Http\Controllers\NilaiAsetController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\WarrantyController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeSalaryController;

Route::post('/login', [AuthController::class , 'login']);
Route::get('/settings', [SettingController::class , 'index']);
Route::get('/ping', [SystemController::class, 'ping']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [DashboardController::class , 'index']);
    Route::get('/laporan-laba', [LaporanLabaController::class , 'index']);
    Route::post('/laporan-laba/piutang', [LaporanLabaController::class , 'updatePiutang']);
    Route::get('/nilai-aset', [NilaiAsetController::class , 'index']);
    Route::get('/settings/backup', [SettingController::class, 'backupDatabase']);
    Route::post('/settings/restore', [SettingController::class, 'restoreDatabase']);
    Route::post('/settings/fix-database', [SettingController::class, 'fixDatabase']);
    Route::post('/settings', [SettingController::class , 'update']);
    Route::post('/logout', [AuthController::class , 'logout']);
    Route::get('/me', [AuthController::class , 'me']);

    // Admin & Users Staff
    Route::apiResource('users', UserController::class);

    // Master Produk & Kategori
    Route::apiResource('categories', CategoryController::class);
    Route::post('products/bulk', [ProductController::class, 'bulkImport']);
    Route::apiResource('products', ProductController::class);

    // Master Distributor & Pembelian
    Route::apiResource('distributors', DistributorController::class);
    Route::apiResource('purchases', PurchaseController::class);

    Route::apiResource('sales', SaleController::class);
    Route::post('sales/{id}/toggle-verify', [SaleController::class, 'toggleVerify']);
    Route::post('sales/{sale}/pelunasan', [SaleController::class, 'pelunasan']);

    // Cash Flow
    Route::get('cash-flows', [CashFlowController::class , 'index']);
    Route::post('cash-flows', [CashFlowController::class , 'store']);
    Route::delete('cash-flows/{id}', [CashFlowController::class , 'destroy']);

    // Gaji & Karyawan
    Route::apiResource('employees', EmployeeController::class);
    Route::get('salaries', [EmployeeSalaryController::class, 'index']);
    Route::post('salaries', [EmployeeSalaryController::class, 'store']);
    Route::delete('salaries/{id}', [EmployeeSalaryController::class, 'destroy']);

    // Stock Opname & Movement
    Route::get('stok-opname', [StockOpnameController::class, 'index']);
    Route::post('stok-opname', [StockOpnameController::class, 'store']);
    Route::get('stok-movements', [StockMovementController::class, 'index']);

    // Garansi
    Route::apiResource('warranties', WarrantyController::class);

    // DANGER ZONE: Reset all data (owner only)
    Route::post('system/reset-all-data', [SystemController::class, 'resetAllData']);
});
