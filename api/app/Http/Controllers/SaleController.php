<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    public function index()
    {
        $sales = Sale::with(['items.product', 'user'])
            ->orderBy('tanggal', 'desc')
            ->get();
        return response()->json($sales);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.manual_name' => 'nullable|string|max:255',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.harga_jual' => 'required|numeric',
            'items.*.satuan' => 'nullable|string|max:20',
            'items.*.parent_idx' => 'nullable|integer',
            'channel' => 'required|string',
            'total_penjualan' => 'required|numeric',
            'pembayaran' => 'required|numeric',
            'kembalian' => 'required|numeric',
            'tax_percent' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $totalPenjualan = $validated['total_penjualan'];
            $totalHpp = 0;
            $itemsToProcess = [];

            foreach ($validated['items'] as $item) {
                $product = null;
                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);

                    if (!$product) {
                        throw new \Exception("Produk tidak ditemukan");
                    }

                    if ($product->stok_saat_ini < $item['qty']) {
                        throw new \Exception("Stok tidak mencukupi untuk: {$product->name}");
                    }
                    $totalHpp += ($product->harga_beli * $item['qty']);
                }

                $itemsToProcess[] = [
                    'product_id' => $item['product_id'] ?? null,
                    'manual_name' => $item['manual_name'] ?? null,
                    'qty' => $item['qty'],
                    'satuan' => $item['satuan'] ?? 'PCS',
                    'harga_jual' => $item['harga_jual'],
                    'product' => $product
                ];
            }

            // Gunakan nomor urut harian yang jauh lebih rapi dan pendek (contoh: INV-20260330-001)
            $todayCount = Sale::whereDate('tanggal', date('Y-m-d'))->count() + 1;
            $invoice = 'INV-' . date('Ymd') . '-' . str_pad($todayCount, 3, '0', STR_PAD_LEFT);
            $taxPercent = $validated['tax_percent'] ?? 0;
            $taxAmount = ($totalPenjualan * $taxPercent) / 100;

            $sale = Sale::create([
                'invoice' => $invoice,
                'channel' => $validated['channel'],
                'tanggal' => now(),
                'total_penjualan' => $totalPenjualan,
                'total_hpp' => $totalHpp,
                'laba_kotor' => $totalPenjualan - $totalHpp - $taxAmount,
                'tax_percent' => $taxPercent,
                'tax_amount' => $taxAmount,
                'pembayaran' => $validated['pembayaran'],
                'kembalian' => $validated['kembalian'],
                'user_id' => $request->user()->id,
            ]);

            $saleItemIds = [];
            foreach ($itemsToProcess as $k => $item) {
                $si = $sale->items()->create([
                    'product_id' => $item['product_id'],
                    'manual_name' => $item['manual_name'],
                    'qty' => $item['qty'],
                    'satuan' => $item['satuan'],
                    'harga_jual_saat_itu' => $item['harga_jual']
                ]);
                $saleItemIds[$k] = $si->id;

                if ($item['product']) {
                    $item['product']->decrement('stok_saat_ini', $item['qty']);
                }
            }

            // Relationship mapping (Rakitan)
            foreach ($validated['items'] as $k => $itemData) {
                if (isset($itemData['parent_idx']) && $itemData['parent_idx'] !== null) {
                    $parentId = $saleItemIds[$itemData['parent_idx']] ?? null;
                    if ($parentId) {
                        DB::table('sale_items')->where('id', $saleItemIds[$k])->update(['parent_id' => $parentId]);
                    }
                }
            }

            DB::commit();
            return response()->json($sale->load(['items.product', 'user']), 201);
        }
        catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function show(Sale $sale)
    {
        return response()->json($sale->load(['items.product', 'user']));
    }

    public function update(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'nama_barang_manual' => 'nullable|string|max:255',
            'username_pembeli' => 'nullable|string|max:255',
            'harga_modal_manual' => 'nullable|numeric|min:0',
            'masuk_dp' => 'nullable|numeric|min:0',
            'keluar_tf' => 'nullable|numeric|min:0',
            'status_pencairan' => 'nullable|string|in:belum,lunas',
        ]);

        $sale->update($validated);

        return response()->json($sale->load(['items.product', 'user']));
    }

    public function destroy(Sale $sale)
    {
        DB::beginTransaction();
        try {
            // Restore stock for each sale item that has a product
            foreach ($sale->items as $item) {
                if ($item->product_id) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->increment('stok_saat_ini', $item->qty);
                    }
                }
            }

            // Delete all sale items first, then the sale
            $sale->items()->delete();
            $sale->delete();

            DB::commit();
            return response()->json(['message' => 'Transaksi berhasil dibatalkan dan stok dikembalikan.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membatalkan transaksi: ' . $e->getMessage()], 500);
        }
    }
}
