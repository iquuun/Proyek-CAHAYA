<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        // Load products with their category
        return response()->json(Product::with('category')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'harga_beli' => 'required|numeric|min:0',
            'harga_jual' => 'required|numeric|min:0',
            'stok_saat_ini' => 'integer|min:0'
        ]);

        $product = Product::create($request->all());
        return response()->json($product->load('category'), 201);
    }

    public function bulkImport(Request $request)
    {
        $items = $request->json()->all();
        if (!is_array($items)) {
            return response()->json(['message' => 'Format tidak valid'], 400);
        }

        $imported = 0;
        foreach ($items as $item) {
            if (empty($item['name']) || !isset($item['harga_jual'])) continue;

            $catId = 1; // Default
            if (!empty($item['category_name'])) {
                $cat = \App\Models\Category::firstOrCreate(['name' => trim($item['category_name'])]);
                $catId = $cat->id;
            }

            Product::updateOrCreate(
                // Use Name as unique identifier for bulk upload. If it exists, update it.
                ['name' => trim($item['name'])], 
                [
                    'category_id' => $catId,
                    'kode' => empty($item['kode']) ? null : trim($item['kode']),
                    'harga_beli' => isset($item['harga_beli']) ? (float)$item['harga_beli'] : 0,
                    'harga_jual' => isset($item['harga_jual']) ? (float)$item['harga_jual'] : 0,
                    'stok_saat_ini' => isset($item['stok_saat_ini']) ? (int)$item['stok_saat_ini'] : 0,
                ]
            );
            $imported++;
        }

        return response()->json(['message' => "$imported produk berhasil diimpor"]);
    }

    public function show($id)
    {
        return response()->json(Product::with('category')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'harga_beli' => 'required|numeric|min:0',
            'harga_jual' => 'required|numeric|min:0',
            'stok_saat_ini' => 'integer|min:0'
        ]);

        $product->update($request->all());
        return response()->json($product->load('category'));
    }

    public function destroy($id)
    {
        Product::destroy($id);
        return response()->json(null, 204);
    }
}
