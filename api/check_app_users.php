<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Database path: " . config('database.connections.sqlite.database') . "\n";
echo "app_users count: " . \Illuminate\Support\Facades\DB::table('app_users')->count() . "\n";
$users = \Illuminate\Support\Facades\DB::table('app_users')->get();
foreach ($users as $u) {
    echo "ID: $u->id, Email: $u->email, PwdHashStart: " . substr($u->password, 0, 10) . "\n";
}
