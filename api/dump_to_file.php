<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$config = DB::table('settings')->get();
file_put_contents('settings_content.json', json_encode($config, JSON_PRETTY_PRINT));
echo "Successfully wrote to settings_content.json\n";
