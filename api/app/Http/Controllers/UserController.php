<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     * Only owner should be able to see the full list of users.
     */
    public function index(Request $request)
    {
        // Require owner role
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Unauthorized. Owner only.'], 403);
        }

        $users = User::orderBy('name')->get();
        return response()->json($users);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Unauthorized. Owner only.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:app_users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:owner,staf',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Unauthorized. Owner only.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('app_users')->ignore($user->id)],
            'role' => 'required|in:owner,staf',
        ]);

        $user->name = $request->name;
        $user->email = $request->email;
        $user->role = $request->role;

        // Optionally update password if provided
        if ($request->filled('password')) {
            $request->validate([
                'password' => 'string|min:6',
            ]);
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json($user);
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Unauthorized. Owner only.'], 403);
        }

        // Prevent owner from deleting themselves
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Anda tidak bisa menghapus akun Anda sendiri.'], 400);
        }

        $user->delete();
        return response()->json(null, 204);
    }
}
