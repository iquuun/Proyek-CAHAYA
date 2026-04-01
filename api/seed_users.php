<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

if (User::count() === 0) {
    User::create(['name'=>'Owner Cahaya','email'=>'owner@cahaya.id','password'=>bcrypt('password123'),'role'=>'owner']);
    User::create(['name'=>'Staf Cahaya','email'=>'staf@cahaya.id','password'=>bcrypt('password123'),'role'=>'staf']);
    echo "Created 2 users!\n";
} else {
    echo "Users already exist: " . User::count() . "\n";
}
