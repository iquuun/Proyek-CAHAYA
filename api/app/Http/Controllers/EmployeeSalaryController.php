<?php

namespace App\Http\Controllers;

use App\Models\EmployeeSalary;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeSalaryController extends Controller
{
    public function index(Request $request)
    {
        $query = EmployeeSalary::with('employee')->orderBy('tanggal', 'desc')->orderBy('id', 'desc');
        
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('bulan')) {
            $query->whereRaw("strftime('%Y-%m', tanggal) = ?", [$request->bulan]);
        }

        return response()->json($query->paginate($request->get('limit', 50)));
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'tanggal' => 'required|date',
            'gaji_pokok' => 'required|numeric',
            'bonus' => 'nullable|numeric',
            'potongan' => 'nullable|numeric',
            'total' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($request) {
            $employee = Employee::findOrFail($request->employee_id);
            
            // 1. Create Cash Flow entry
            $tanggal = $request->tanggal;
            if (strlen($tanggal) <= 10) {
                $tanggal .= ' ' . date('H:i:s');
            }

            $cashFlowId = DB::table('cash_flows')->insertGetId([
                'tanggal' => $tanggal,
                'tipe' => 'keluar',
                'sumber' => 'gaji_karyawan',
                'nominal' => abs($request->total),
                'keterangan' => "Gaji {$employee->name}: " . ($request->keterangan ?? "Periode " . date('M Y', strtotime($request->tanggal))),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 2. Create Salary entry
            $salary = EmployeeSalary::create([
                'employee_id' => $request->employee_id,
                'tanggal' => $request->tanggal,
                'gaji_pokok' => $request->gaji_pokok,
                'bonus' => $request->bonus ?? 0,
                'potongan' => $request->potongan ?? 0,
                'total' => $request->total,
                'keterangan' => $request->keterangan,
                'cash_flow_id' => $cashFlowId,
            ]);

            return response()->json($salary);
        });
    }

    public function destroy($id)
    {
        $salary = EmployeeSalary::findOrFail($id);
        
        DB::transaction(function () use ($salary) {
            if ($salary->cash_flow_id) {
                DB::table('cash_flows')->where('id', $salary->cash_flow_id)->delete();
            }
            $salary->delete();
        });

        return response()->json(['message' => 'Salary record and linked cash flow deleted']);
    }
}
