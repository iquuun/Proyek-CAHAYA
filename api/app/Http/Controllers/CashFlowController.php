<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashFlowController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('cash_flows as cf')
            ->leftJoin('app_users as u', 'cf.staff_user_id', '=', 'u.id')
            ->select('cf.*', 'u.name as staff_name')
            ->orderBy('cf.tanggal', 'desc')
            ->orderBy('cf.id', 'desc');

        if ($request->has('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->has('bulan') && $request->bulan) {
            // Use strftime for SQLite compatibility
            $query->whereRaw("strftime('%Y-%m', tanggal) = ?", [$request->bulan]);
        }

        $cashFlows = $query->get();

        // Summary FILTERED by the same bulan filter
        $summaryQuery = DB::table('cash_flows');
        if ($request->has('bulan') && $request->bulan) {
            $summaryQuery->whereRaw("strftime('%Y-%m', tanggal) = ?", [$request->bulan]);
        }

        $summary = $summaryQuery->selectRaw("
            SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) as total_masuk,
            SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as total_keluar,
            SUM(CASE WHEN tipe = 'keluar' AND sumber = 'biaya_operasional' THEN nominal ELSE 0 END) as biaya_operasional
        ")->first();

        $totalMasuk = (float) ($summary->total_masuk ?? 0);
        $totalKeluar = (float) ($summary->total_keluar ?? 0);
        $biayaOperasional = (float) ($summary->biaya_operasional ?? 0);

        return response()->json([
            'data' => $cashFlows,
            'total_masuk' => $totalMasuk,
            'total_keluar' => $totalKeluar,
            'biaya_operasional' => $biayaOperasional,
            'saldo' => $totalMasuk - $totalKeluar,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'tipe' => 'required|in:masuk,keluar',
            'sumber' => 'required|string',
            'nominal' => 'required|numeric|min:1',
            'keterangan' => 'nullable|string',
            'staff_user_id' => 'nullable|exists:app_users,id',
        ]);

        $id = DB::table('cash_flows')->insertGetId([
            'tanggal' => $request->tanggal,
            'tipe' => $request->tipe,
            'sumber' => $request->sumber,
            'nominal' => $request->nominal,
            'keterangan' => $request->keterangan,
            'staff_user_id' => $request->staff_user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Cash flow berhasil ditambahkan', 'id' => $id], 201);
    }

    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {
            $flow = DB::table('cash_flows')->where('id', $id)->first();
            
            if (!$flow) {
                return response()->json(['message' => 'Data tidak ditemukan'], 404);
            }

            // Jika sumbernya adalah gaji_karyawan, hapus juga data di tabel employee_salaries
            if ($flow->sumber === 'gaji_karyawan') {
                DB::table('employee_salaries')->where('cash_flow_id', $id)->delete();
            }

            // Hapus data mutasi utama
            DB::table('cash_flows')->where('id', $id)->delete();

            return response()->json(['message' => 'Transaksi dan data terkait berhasil dihapus']);
        });
    }
}
