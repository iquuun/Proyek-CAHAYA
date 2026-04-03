<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$schema = DB::connection()->getSchemaBuilder()->getColumnListing('settings');
print_r($schema);

$res = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'");
print_r($res);
