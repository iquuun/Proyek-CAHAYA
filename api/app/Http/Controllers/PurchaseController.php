<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index()
    {
        $purchases = Purchase::with(['distributor', 'items.product'])->orderBy('tanggal', 'desc')->get();
        return response()->json($purchases);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice' => 'nullable|string|unique:purchases,invoice',
            'distributor_id' => 'required|exists:distributors,id',
            'tanggal' => 'required|date',
            'total_pembelian' => 'required|numeric|min:0',
            'terbayar' => 'required|numeric|min:0',
            'status_pembayaran' => 'required|in:lunas,hutang',
            'jatuh_tempo' => 'nullable|date',
            // Optional: items array to restock products at the same time
            'items' => 'nullable|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|numeric|min:1',
            'items.*.harga_beli' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $invoiceToUse = !empty($validated['invoice']) ? $validated['invoice'] : 'PO-' . date('Ym') . '-' . strtoupper(uniqid());

            $purchase = Purchase::create([
                'invoice' => $invoiceToUse,
                'distributor_id' => $validated['distributor_id'],
                'tanggal' => $validated['tanggal'],
                'total_pembelian' => $validated['total_pembelian'],
                'terbayar' => $validated['terbayar'],
                'status_pembayaran' => $validated['status_pembayaran'],
                'jatuh_tempo' => $validated['jatuh_tempo'] ?? null,
            ]);

            // If items are provided in the purchase request, save them and update product stock
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    // Update Stock & HPP
                    $product = Product::find($item['product_id']);
                    $product->stok_saat_ini += $item['qty'];
                    $product->harga_beli = $item['harga_beli']; // Update to latest HPP
                    $product->save();

                    // Save purchase item
                    $purchase->items()->create([
                        'product_id' => $item['product_id'],
                        'qty' => $item['qty'],
                        'harga_beli' => $item['harga_beli'],
                    ]);
                }
            }

            DB::commit();
            return response()->json($purchase->load('distributor'), 201);
        }
        catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan pembelian: ' . $e->getMessage()], 500);
        }
    }

    public function show(Purchase $purchase)
    {
        return response()->json($purchase->load('distributor'));
    }

    public function update(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'terbayar' => 'required|numeric|min:0',
        ]);

        $status = ($purchase->total_pembelian <= $validated['terbayar']) ? 'lunas' : 'hutang';

        $purchase->update([
            'terbayar' => $validated['terbayar'],
            'status_pembayaran' => $status
        ]);

        return response()->json($purchase->load('distributor'));
    }

    public function destroy(Purchase $purchase)
    {
        // Typically purchases shouldn't be deleted if they've affected stock, but for this simple app:
        $purchase->delete();
        return response()->json(['message' => 'Purchase deleted successfully']);
    }
}
