<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockOpnameItem extends Model
{
    protected $guarded = [];

    public function stockOpname()
    {
        return $this->belongsTo(StockOpname::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
