<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LaporanLabaController extends Controller
{
    public function index(Request $request)
    {
        $now = Carbon::now();
        $bulanIni = $now->copy()->startOfMonth();
        $bulanIniEnd = $now->copy()->endOfMonth();
        $bulanLalu = $now->copy()->subMonth()->startOfMonth();
        $bulanLaluEnd = $now->copy()->subMonth()->endOfMonth();
        $hariIni = $now->copy()->startOfDay()->toDateString();
        $hariKemarin = $now->copy()->subDay()->startOfDay()->toDateString();

        // 1. Uang Online (Hutang Market / Dana Belum Cair)
        // Total dana yang masih tertahan di marketplace (Masuk/DP - Keluar/TF) yang belum lunas
        $uangOnlinePending = (float) DB::table('sales')
            ->where('channel', '!=', 'UMUM')
            ->whereRaw('COALESCE(masuk_dp, 0) > 0')
            ->whereRaw('COALESCE(keluar_tf, 0) < COALESCE(masuk_dp, 0)')
            ->sum(DB::raw('COALESCE(masuk_dp, 0) - COALESCE(keluar_tf, 0)'));

        // Pemasukan Online Bulan Ini vs Lalu (sebagai pembanding performa sales)
        $omzetOnlineBulanIni = (float) DB::table('sales')
            ->where('channel', '!=', 'UMUM')
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum('total_penjualan');

        $omzetOnlineBulanLalu = (float) DB::table('sales')
            ->where('channel', '!=', 'UMUM')
            ->whereBetween('tanggal', [$bulanLalu->toDateString(), $bulanLaluEnd->toDateString()])
            ->sum('total_penjualan');

        // 2. Uang di Rekening (saldo dari cash_flows seluruhnya)
        $rekeningData = DB::table('cash_flows')->selectRaw("
            SUM(CASE WHEN tipe = 'masuk' THEN ABS(nominal) ELSE 0 END) -
            SUM(CASE WHEN tipe = 'keluar' THEN ABS(nominal) ELSE 0 END) as saldo
        ")->first();
        $uangRekening = (float) ($rekeningData->saldo ?? 0);

        // 3. Jumlah Utang bulan ini vs bulan kemarin (dari purchases status = hutang)
        $hutangBulanIni = (float) DB::table('purchases')
            ->where('status_pembayaran', 'hutang')
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum(DB::raw('total_pembelian - terbayar'));

        $hutangBulanLalu = (float) DB::table('purchases')
            ->where('status_pembayaran', 'hutang')
            ->whereBetween('tanggal', [$bulanLalu->toDateString(), $bulanLaluEnd->toDateString()])
            ->sum(DB::raw('total_pembelian - terbayar'));

        // Total sisa hutang keseluruhan (aktif, belum lunas)
        $totalSisaHutang = (float) DB::table('purchases')
            ->whereColumn('total_pembelian', '>', 'terbayar')
            ->sum(DB::raw('total_pembelian - terbayar'));

        // 4. Hutang per distributor
        $hutangPerDistributor = DB::table('purchases')
            ->join('distributors', 'purchases.distributor_id', '=', 'distributors.id')
            ->whereColumn('purchases.total_pembelian', '>', 'purchases.terbayar')
            ->groupBy('distributors.id', 'distributors.name')
            ->select(
                'distributors.name',
                DB::raw('SUM(purchases.total_pembelian) as total_pembelian'),
                DB::raw('SUM(purchases.terbayar) as total_terbayar'),
                DB::raw('SUM(purchases.total_pembelian - purchases.terbayar) as sisa_hutang'),
                DB::raw('COUNT(purchases.id) as jumlah_transaksi')
            )
            ->get();

        // 5. Uang Stok / Nilai Aset
        $uangStok = (float) DB::table('products')->sum(DB::raw('stok_saat_ini * harga_beli'));

        // 6. Laba Bersih Harian (Net Profit): hari ini vs kemarin
        // Rumus: Total Penjualan - HPP - ADM - Ops
        
        // --- HITUNG HARI INI ---
        $pendapatanHariIni = (float) DB::table('sales')
            ->whereDate('tanggal', $hariIni)
            ->sum('total_penjualan');
            
        $hppHariIniSql = DB::select("
            SELECT SUM(si.qty * COALESCE(p.harga_beli, 0)) as total_hpp
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON p.id = si.product_id
            WHERE DATE(s.tanggal) = ?
        ", [$hariIni]);
        $totalHppHariIni = (float) ($hppHariIniSql[0]->total_hpp ?? 0);
        
        $admHariIni = (float) DB::table('sales')
            ->whereDate('tanggal', $hariIni)
            ->where('channel', '!=', 'UMUM')
            ->where('masuk_dp', '>', 0)
            ->sum(DB::raw('total_penjualan - masuk_dp'));
            
        $opsHariIni = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->where('sumber', 'biaya_operasional')
            ->whereDate('tanggal', $hariIni)
            ->sum('nominal');
            
        $labaBersihHariIni = $pendapatanHariIni - $totalHppHariIni - $admHariIni - $opsHariIni;

        // --- HITUNG HARI KEMARIN ---
        $pendapatanHariKemarin = (float) DB::table('sales')
            ->whereDate('tanggal', $hariKemarin)
            ->sum('total_penjualan');
            
        $hppHariKemarinSql = DB::select("
            SELECT SUM(si.qty * COALESCE(p.harga_beli, 0)) as total_hpp
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON p.id = si.product_id
            WHERE DATE(s.tanggal) = ?
        ", [$hariKemarin]);
        $totalHppHariKemarin = (float) ($hppHariKemarinSql[0]->total_hpp ?? 0);
        
        $admHariKemarin = (float) DB::table('sales')
            ->whereDate('tanggal', $hariKemarin)
            ->where('channel', '!=', 'UMUM')
            ->where('masuk_dp', '>', 0)
            ->sum(DB::raw('total_penjualan - masuk_dp'));
            
        $opsHariKemarin = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->where('sumber', 'biaya_operasional')
            ->whereDate('tanggal', $hariKemarin)
            ->sum('nominal');
            
        $labaBersihHariKemarin = $pendapatanHariKemarin - $totalHppHariKemarin - $admHariKemarin - $opsHariKemarin;

        // 7. Uang di Luar (Piutang) — dari settings
        $piutangSetting = DB::table('settings')->where('key', 'piutang_pembeli')->first();
        $uangDiLuar = (float) ($piutangSetting->value ?? 0);

        // 8. Uang Kas = Rekening + Online (Hutang Market) + Aset - Total Hutang Aktif
        $uangKas = $uangRekening + $uangOnlinePending + $uangStok - $totalSisaHutang;

        // 9. Margin 1 Bulan (Pendapatan - HPP - Biaya Operasional bulan ini)
        $pendapatanBulanan = (float) DB::table('sales')
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum('total_penjualan');

        $hppBulanan = DB::select("
            SELECT SUM(si.qty * COALESCE(p.harga_beli, 0)) as total_hpp
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON p.id = si.product_id
            WHERE s.tanggal BETWEEN ? AND ?
        ", [$bulanIni->toDateString(), $bulanIniEnd->toDateString()]);
        $totalHppBulanan = (float) ($hppBulanan[0]->total_hpp ?? 0);

        $biayaOperasionalBulanan = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->where('sumber', 'biaya_operasional')
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum('nominal');

        $admBulanan = (float) DB::table('sales')
            ->where('channel', '!=', 'UMUM')
            ->where('masuk_dp', '>', 0)
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum(DB::raw('total_penjualan - masuk_dp'));

        $marginBulanan = $pendapatanBulanan - $totalHppBulanan - $biayaOperasionalBulanan - $admBulanan;

        // 10. Pemasukan (Hari Ini / Bulan Ini / Tahun Ini / Seluruh)
        $tahunIni = $now->copy()->startOfYear();
        $tahunIniEnd = $now->copy()->endOfYear();

        $pemasukanHariIni = $pendapatanHariIni;
        $pemasukanBulanIni = $pendapatanBulanan;
        $pemasukanTahunIni = (float) DB::table('sales')
            ->whereBetween('tanggal', [$tahunIni->toDateString(), $tahunIniEnd->toDateString()])
            ->sum('total_penjualan');
        $pemasukanSeluruh = (float) DB::table('sales')->sum('total_penjualan');

        // 11. Pengeluaran (Hari Ini / Bulan Ini / Tahun Ini / Seluruh)
        $pengeluaranHariIni = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->whereDate('tanggal', $hariIni)
            ->sum('nominal');
        $pengeluaranBulanIni = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->whereBetween('tanggal', [$bulanIni->toDateString(), $bulanIniEnd->toDateString()])
            ->sum('nominal');
        $pengeluaranTahunIni = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->whereBetween('tanggal', [$tahunIni->toDateString(), $tahunIniEnd->toDateString()])
            ->sum('nominal');
        $pengeluaranSeluruh = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->sum('nominal');

        // 12. Grafik Pemasukan vs Pengeluaran per bulan (tahun ini)
        $chartData = [];
        $bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        for ($m = 1; $m <= 12; $m++) {
            if ($m > $now->month) continue;
            $mStart = Carbon::create($now->year, $m, 1)->startOfMonth();
            $mEnd = Carbon::create($now->year, $m, 1)->endOfMonth();

            $salesQuery = DB::table('sales')->whereBetween('tanggal', [$mStart->toDateString(), $mEnd->toDateString()]);
            $masuk = (float) $salesQuery->sum('total_penjualan');
            $hpp = (float) $salesQuery->sum('total_hpp');
            $labaKotor = $masuk - $hpp;

            $keluar = (float) DB::table('cash_flows')
                ->where('tipe', 'keluar')
                ->whereBetween('tanggal', [$mStart->toDateString(), $mEnd->toDateString()])
                ->sum('nominal');

            $adm = (float) $salesQuery->clone()
                ->where('channel', '!=', 'UMUM')
                ->where('masuk_dp', '>', 0)
                ->sum(DB::raw('total_penjualan - masuk_dp'));

            $labaBersih = $labaKotor - $keluar - $adm;

            $chartData[] = [
                'bulan' => $bulanNames[$m - 1],
                'pemasukan' => $masuk,
                'pengeluaran' => $keluar,
                'laba_bersih' => $labaBersih,
            ];
        }

        return response()->json([
            'pemasukan' => [
                'hari_ini' => $pemasukanHariIni,
                'bulan_ini' => $pemasukanBulanIni,
                'tahun_ini' => $pemasukanTahunIni,
                'seluruh' => $pemasukanSeluruh,
            ],
            'pengeluaran' => [
                'hari_ini' => $pengeluaranHariIni,
                'bulan_ini' => $pengeluaranBulanIni,
                'tahun_ini' => $pengeluaranTahunIni,
                'seluruh' => $pengeluaranSeluruh,
            ],
            'chart_data' => $chartData,
            'uang_online' => [
                'bulan_ini' => $uangOnlinePending,
                'bulan_lalu' => $omzetOnlineBulanLalu,
                'omzet_bulan_ini' => $omzetOnlineBulanIni,
            ],
            'uang_rekening' => $uangRekening,
            'hutang' => [
                'bulan_ini' => $hutangBulanIni,
                'bulan_lalu' => $hutangBulanLalu,
                'total_aktif' => $totalSisaHutang,
            ],
            'hutang_per_distributor' => $hutangPerDistributor,
            'uang_stok' => $uangStok,
            'pendapatan_harian' => [
                'hari_ini' => $labaBersihHariIni,
                'hari_kemarin' => $labaBersihHariKemarin,
            ],
            'uang_kas' => $uangKas,
            'uang_di_luar' => $uangDiLuar,
            'margin_bulanan' => [
                'pendapatan' => $pendapatanBulanan,
                'hpp' => $totalHppBulanan,
                'biaya_operasional' => $biayaOperasionalBulanan,
                'adm' => $admBulanan,
                'margin' => $marginBulanan,
            ],
        ]);
    }

    // Endpoint to save piutang to settings
    public function updatePiutang(Request $request)
    {
        $request->validate([
            'piutang_pembeli' => 'required|numeric|min:0',
        ]);

        DB::table('settings')->updateOrInsert(
            ['key' => 'piutang_pembeli'],
            ['value' => $request->piutang_pembeli]
        );

        return response()->json(['message' => 'Piutang berhasil diperbarui']);
    }
}
