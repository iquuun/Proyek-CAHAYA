<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $request = Illuminate\Http\Request::create('/api/dashboard', 'GET');
    $data = app()->make('App\Http\Controllers\DashboardController')->index($request)->getData();
    echo "SUCCESS\n";
    print_r($data);
}
catch (\Exception $e) {
    echo "ERROR CLASS: " . get_class($e) . "\n";
    echo "MESSAGE:\n" . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
