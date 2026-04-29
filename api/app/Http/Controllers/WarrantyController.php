<?php

namespace App\Http\Controllers;

use App\Models\Warranty;
use Illuminate\Http\Request;

class WarrantyController extends Controller
{
    public function index()
    {
        $warranties = Warranty::with('creator')->orderBy('id', 'desc')->get();
        return response()->json($warranties);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_name' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'product_name' => 'required|string',
            'tanggal_pembelian' => 'nullable|date',
            'tanggal_masuk' => 'required|date',
            'status' => 'required|in:diterima_toko,proses_distributor,dikirim_ke_customer',
            'catatan' => 'nullable|string',
            'nomor_resi' => 'nullable|string',
            'distributor_name' => 'nullable|string',
            'tanggal_kirim_distributor' => 'nullable|date',
        ]);

        $data = $request->only([
            'customer_name', 'customer_phone', 'product_name', 'tanggal_pembelian',
            'tanggal_masuk', 'status', 'catatan', 'nomor_resi',
            'distributor_name', 'tanggal_kirim_distributor',
        ]);
        $data['created_by'] = $request->user()->id;

        $warranty = Warranty::create($data);

        return response()->json($warranty, 201);
    }

    public function update(Request $request, Warranty $warranty)
    {
        $request->validate([
            'customer_name' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'product_name' => 'required|string',
            'tanggal_pembelian' => 'nullable|date',
            'tanggal_masuk' => 'required|date',
            'status' => 'required|in:diterima_toko,proses_distributor,dikirim_ke_customer',
            'catatan' => 'nullable|string',
            'nomor_resi' => 'nullable|string',
            'distributor_name' => 'nullable|string',
            'tanggal_kirim_distributor' => 'nullable|date',
        ]);

        $data = $request->only([
            'customer_name', 'customer_phone', 'product_name', 'tanggal_pembelian',
            'tanggal_masuk', 'status', 'catatan', 'nomor_resi',
            'distributor_name', 'tanggal_kirim_distributor',
        ]);

        $warranty->update($data);

        return response()->json($warranty);
    }

    public function destroy(Warranty $warranty)
    {
        $warranty->delete();
        return response()->json(null, 204);
    }
}
