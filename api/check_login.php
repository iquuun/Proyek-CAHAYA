<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

$user = User::where('email', 'owner@cahaya.id')->first();
if (!$user) {
    echo "User owner@cahaya.id not found!\n";
    $users = User::all();
    echo "Available users: " . count($users) . "\n";
    foreach ($users as $u) {
        echo " - " . $u->email . "\n";
    }
} else {
    echo "User found: " . $user->email . "\n";
    echo "Checking password 'password123': " . (Hash::check('password123', $user->password) ? 'MATCH' : 'MISMATCH') . "\n";
    
    // Check what database connection is actually used
    echo "Database path: " . config('database.connections.sqlite.database') . "\n";
}
