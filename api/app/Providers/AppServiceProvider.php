<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Http\Controllers\SystemController;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Auto-create default users if database is empty
        // This ensures the login page ALWAYS works
        try {
            SystemController::ensureDefaultUsers();
        } catch (\Exception $e) {
            // Silently fail during boot — don't crash the app
        }
    }
}
