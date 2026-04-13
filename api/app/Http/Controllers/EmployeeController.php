<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(Employee::where('is_active', true)->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:employees,name',
            'base_salary' => 'nullable|numeric|min:0'
        ]);
        $employee = Employee::create($request->all());
        return response()->json($employee);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);
        $employee->update($request->all());
        return response()->json($employee);
    }

    public function destroy($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->update(['is_active' => false]);
        return response()->json(['message' => 'Employee deactivated']);
    }
}
