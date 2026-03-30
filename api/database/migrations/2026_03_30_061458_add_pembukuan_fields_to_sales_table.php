<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('nama_barang_manual')->nullable()->after('channel');
            $table->string('username_pembeli')->nullable()->after('nama_barang_manual');
            $table->decimal('harga_modal_manual', 15, 2)->nullable()->after('username_pembeli');
            $table->decimal('masuk_dp', 15, 2)->nullable()->after('harga_modal_manual');
            $table->decimal('keluar_tf', 15, 2)->nullable()->after('masuk_dp');
            $table->string('status_pencairan')->default('belum')->after('keluar_tf');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'nama_barang_manual',
                'username_pembeli',
                'harga_modal_manual',
                'masuk_dp',
                'keluar_tf',
                'status_pencairan'
            ]);
        });
    }
};
