<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

class SystemController extends Controller
{
    /**
     * Ensure default users exist. Called automatically on app boot.
     * This guarantees the login page ALWAYS works — no more "Setup Diperlukan".
     */
    public static function ensureDefaultUsers(): void
    {
        try {
            $userTable = (new User)->getTable();

            // Step 1: Ensure tables exist
            if (!Schema::hasTable($userTable)) {
                Artisan::call('migrate', ['--force' => true]);
            }

            // Step 2: Ensure default users exist
            if (Schema::hasTable($userTable) && User::count() === 0) {
                User::create([
                    'name' => 'Owner Cahaya',
                    'email' => 'owner@cahaya.id',
                    'password' => bcrypt('password123'),
                    'role' => 'owner',
                ]);
                User::create([
                    'name' => 'Staf Cahaya',
                    'email' => 'staf@cahaya.id',
                    'password' => bcrypt('password123'),
                    'role' => 'staf',
                ]);
            }
        } catch (\Exception $e) {
            // Silently fail — don't crash the app
            \Log::error('ensureDefaultUsers failed: ' . $e->getMessage());
        }
    }

    /**
     * Health check endpoint — also ensures users exist.
     */
    public function ping()
    {
        self::ensureDefaultUsers();
        
        return response()->json([
            'status' => 'ok',
            'message' => 'Server berjalan normal.',
        ]);
    }

    /**
     * DANGER ZONE: Reset ALL business data.
     * Requires authenticated owner + confirmation text.
     * Preserves: users, settings, personal_access_tokens, migrations.
     */
    public function resetAllData(Request $request)
    {
        try {
            $request->validate([
                'confirmation' => 'required|string',
            ]);

            if ($request->confirmation !== 'HAPUS SEMUA DATA') {
                return response()->json([
                    'success' => false,
                    'message' => 'Teks konfirmasi tidak sesuai. Ketik persis: HAPUS SEMUA DATA'
                ], 422);
            }

            $user = $request->user();
            if (!$user || $user->role !== 'owner') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya pemilik (Owner) yang dapat menghapus semua data.'
                ], 403);
            }

            DB::statement('PRAGMA foreign_keys = OFF;');

            $userTable = (new User)->getTable();
            $protectedTables = [$userTable, 'settings', 'migrations', 'personal_access_tokens', 'sessions', 'cache', 'cache_locks', 'jobs', 'failed_jobs'];
            
            $allTables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            
            $deletedTables = [];
            foreach ($allTables as $table) {
                $tableName = $table->name;
                if (!in_array($tableName, $protectedTables)) {
                    DB::table($tableName)->delete();
                    $deletedTables[] = $tableName;
                }
            }

            DB::statement('PRAGMA foreign_keys = ON;');

            return response()->json([
                'success' => true,
                'message' => 'Semua data berhasil dihapus! (' . count($deletedTables) . ' tabel direset)',
                'tables_cleared' => $deletedTables,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus data: ' . $e->getMessage()
            ], 500);
        }
    }
}
