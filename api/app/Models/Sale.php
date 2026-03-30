<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'invoice',
        'channel',
        'tanggal',
        'total_penjualan',
        'total_hpp',
        'laba_kotor',
        'tax_percent',
        'tax_amount',
        'pembayaran',
        'kembalian',
        'user_id',
        'nama_barang_manual',
        'username_pembeli',
        'harga_modal_manual',
        'masuk_dp',
        'keluar_tf',
        'status_pencairan'
    ];

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
