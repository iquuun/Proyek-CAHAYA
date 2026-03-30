<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    protected $fillable = [
        'invoice',
        'distributor_id',
        'tanggal',
        'total_pembelian',
        'terbayar',
        'status_pembayaran',
        'jatuh_tempo',
    ];

    public function distributor()
    {
        return $this->belongsTo(Distributor::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }
}
