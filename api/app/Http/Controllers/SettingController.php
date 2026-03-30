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
        $data = $request->only(['store_name', 'store_address', 'store_phone', 'store_notes']);

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
}
