<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index()
    {
        $settings = DB::table('settings')->get()->pluck('value', 'key');
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $data = $request->only(['store_name', 'store_address', 'store_phone', 'store_notes', 'invoice_start_number', 'ecommerce_calc_config', 'catatan_belanja', 'piutang_pembeli', 'pos_templates']);

        foreach ($data as $key => $value) {
            DB::table('settings')->updateOrInsert(['key' => $key], ['value' => $value]);
        }

        if ($request->hasFile('store_logo')) {
            $path = $request->file('store_logo')->store('logos', 'public');
            DB::table('settings')->updateOrInsert(['key' => 'store_logo'], ['value' => $path]);
        }

        return response()->json(['message' => 'Pengaturan berhasil diperbarui']);
    }

    public function backupDatabase()
    {
        $dbPath = database_path('database.sqlite');
        
        if (!file_exists($dbPath)) {
            return response()->json(['message' => 'File database tidak ditemukan.'], 404);
        }

        $date = now()->format('Y-m-d_H-i');
        $filename = "Backup-CahayaKomputer-{$date}.sqlite";

        return response()->download($dbPath, $filename);
    }

    public function restoreDatabase(Request $request)
    {
        $request->validate([
            'backup_file' => 'required|file',
        ]);

        $file = $request->file('backup_file');
        
        $extension = $file->getClientOriginalExtension();
        if ($extension !== 'sqlite' && $extension !== 'db' && $file->getClientOriginalName() !== 'database.sqlite') {
            // Also checking if the original name is just 'database.sqlite' because sometimes extension is empty
            $name_parts = explode('.', $file->getClientOriginalName());
            $ext = end($name_parts);
            if ($ext !== 'sqlite' && $ext !== 'db') {
                 return response()->json(['message' => 'Format file tidak valid. Ekstensi harus .sqlite atau .db'], 400);
            }
        }

        $dbPath = database_path('database.sqlite');
        
        // Backup existing just in case
        if (file_exists($dbPath)) {
            copy($dbPath, database_path('database_temp_backup.sqlite'));
        }

        try {
            // Disconnect to release any locks from current process (important for Windows)
            DB::disconnect();
            
            // On Windows, move/rename might fail if another process (like a queue worker) 
            // has the file open. We try to move it.
            $file->move(database_path(), 'database.sqlite');
            
            return response()->json(['message' => 'Database berhasil dipulihkan dari backup.']);
        } catch (\Exception $e) {
            // Restore previous backup if failed
            if (file_exists(database_path('database_temp_backup.sqlite'))) {
                copy(database_path('database_temp_backup.sqlite'), $dbPath);
            }
            return response()->json(['message' => 'Gagal memulihkan database (file mungkin sedang dikunci sistem). Silakan coba lagi atau restart server. Detail: ' . $e->getMessage()], 500);
        }
    }

    public function fixDatabase()
    {
        try {
            // Run migrations programmatically
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $output = \Illuminate\Support\Facades\Artisan::output();
            
            return response()->json([
                'message' => 'Database berhasil disinkronisasi.',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat memperbaiki database.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
