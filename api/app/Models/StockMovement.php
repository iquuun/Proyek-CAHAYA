<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id',
        'tipe',
        'sumber',
        'reference_id',
        'qty',
        'keterangan',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
