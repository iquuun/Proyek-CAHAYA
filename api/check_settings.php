<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$settings = DB::table('settings')->get();
foreach ($settings as $setting) {
    echo "{$setting->key}: {$setting->value}\n";
}
