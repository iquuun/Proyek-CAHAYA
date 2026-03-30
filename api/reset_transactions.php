<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    DB::statement('PRAGMA foreign_keys = OFF;');
    
    $tables = [
        'stock_opnames', 'stock_opname_items', 
        'warranties', 'warranty_logs', 'stock_movements'
    ];
    
    foreach ($tables as $table) {
        DB::table($table)->truncate();
        echo "Truncated $table\n";
    }
    
    DB::statement('PRAGMA foreign_keys = ON;');
    echo "Reset Complete\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
