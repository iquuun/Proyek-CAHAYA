<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $email = trim($request->email);
        \Log::info("Login attempt for email: '{$email}'");

        $user = User::where('email', $email)->first();

        if (!$user) {
            \Log::warning("Login failed: User not found for email '{$email}'");
            return response()->json([
                'message' => 'Email atau Password salah'
            ], 401);
        }

        if (!Hash::check($request->password, $user->password)) {
            \Log::warning("Login failed: Password mismatch for email '{$email}'");
            return response()->json([
                'message' => 'Email atau Password salah'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
