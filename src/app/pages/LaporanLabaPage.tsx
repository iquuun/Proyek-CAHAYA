import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { TrendingUp, ShoppingCart, Package, DollarSign, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api';

interface LaporanData {
  summary: {
    total_pendapatan: number;
    total_hpp: number;
    total_biaya: number;
    laba_kotor: number;
    laba_bersih: number;
  };
  monthlyData: {
    bulan: string;
    pendapatan: number;
    hpp: number;
    biaya: number;
    laba: number;
  }[];
}

export default function LaporanLabaPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const { isOwner } = useAuth();
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchLaporan = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/laporan-laba?month=${month}&year=${year}`);
        setData(res.data);
      } catch (error) {
        console.error("Gagal memuat laporan laba", error);
      } finally {
        setLoading(false);
      }
    };
    if (isOwner) fetchLaporan();
  }, [month, year, isOwner]);

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="flex gap-3"><div className="h-9 bg-gray-200 rounded-lg w-24" /><div className="h-9 bg-gray-200 rounded-lg w-36" /></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => (<div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /><div className="h-3 bg-gray-200 rounded w-20" /></div><div className="h-6 bg-gray-200 rounded w-32" /></div>))}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-48 mb-3" /><div className="h-[300px] bg-gray-100 rounded-lg" /></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-48 mb-3" /><div className="h-[300px] bg-gray-100 rounded-lg" /></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    total_pendapatan: totalPendapatan,
    total_hpp: totalHPP,
    total_biaya: totalBiaya,
    laba_kotor: labaKotor,
    laba_bersih: labaBersih
  } = data.summary;

  const exportToCSV = () => {
    if (!data) return;
    
    const worksheetData: any[][] = [
      ["LAPORAN LABA RUGI CAHAYA KOMPUTER"],
      [`Periode:`, month === 'all' ? `Tahun ${year}` : `Bulan ${month} Tahun ${year}`],
      [],
      ["RINGKASAN KEUANGAN"],
      ["Pendapatan Penjualan", totalPendapatan],
      ["Harga Pokok Penjualan (HPP)", totalHPP],
      ["Laba Kotor", labaKotor],
      ["Biaya Operasional", totalBiaya],
      ["Laba Bersih", labaBersih],
      [],
      ["RINCIAN PER BULAN"],
      ["Bulan", "Pendapatan", "HPP", "Biaya", "Laba Bersih"]
    ];
    
    data.monthlyData.forEach(row => {
      worksheetData.push([row.bulan, row.pendapatan, row.hpp, row.biaya, row.laba]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 30 }, // Bulan / Labels
      { wch: 20 }, // Pendapatan
      { wch: 20 }, // HPP
      { wch: 20 }, // Biaya
      { wch: 20 }  // Laba Bersih
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Laba Rugi");
    
    XLSX.writeFile(workbook, `Laporan_Laba_${month}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              Laporan Laba Rugi
            </h2>
            <p className="text-sm text-gray-500 mt-1">Analisis keuangan dan profitabilitas bisnis</p>
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all active:scale-95 text-sm"
          >
            <Download size={18} />
            Export ke Excel (.csv)
          </button>
        </div>
      )}

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-700">Tahun:</label>
          <select 
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
          >
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>

          <label className="text-xs font-medium text-gray-700 ml-4">Bulan:</label>
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
          >
            <option value="all">Sepanjang Tahun (Semua Bulan)</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="text-[#3B82F6]" size={16} />
            </div>
            <p className="text-xs text-gray-600">Pendapatan</p>
          </div>
          <p className="text-xl font-bold text-[#3B82F6]">
            Rp {totalPendapatan.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Total penjualan</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="text-orange-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">HPP</p>
          </div>
          <p className="text-xl font-bold text-orange-600">
            Rp {totalHPP.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Harga Pokok Penjualan</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Laba Kotor</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            Rp {labaKotor.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Margin {totalPendapatan > 0 ? ((labaKotor / totalPendapatan) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-purple-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Laba Bersih</p>
          </div>
          <p className="text-xl font-bold text-purple-600">
            Rp {labaBersih.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Net margin {totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-base font-medium text-gray-800 mb-3">Tren Pendapatan & Laba (Tahun {year})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bulan" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}M`} />
              <Tooltip
                formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
              />
              <Legend />
              <Bar dataKey="pendapatan" fill="#3B82F6" name="Pendapatan" />
              <Bar dataKey="laba" fill="#10B981" name="Laba Bersih" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-base font-medium text-gray-800 mb-3">Analisis HPP & Biaya (Tahun {year})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bulan" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}M`} />
              <Tooltip
                formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
              />
              <Legend />
              <Line type="monotone" dataKey="hpp" stroke="#F59E0B" strokeWidth={2} name="HPP" />
              <Line type="monotone" dataKey="biaya" stroke="#EF4444" strokeWidth={2} name="Biaya" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Report */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h3 className="text-base font-medium text-gray-800 mb-3">
          Detail Laporan Laba Rugi ({month === 'all' ? `Tahun ${year}` : `Bulan ${month} Tahun ${year}`})
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-700">Pendapatan Penjualan</span>
            <span className="font-medium text-gray-800">Rp {totalPendapatan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-700">Harga Pokok Penjualan (HPP)</span>
            <span className="font-medium text-red-600">- Rp {totalHPP.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200 bg-green-50 px-3 rounded-lg">
            <span className="font-medium text-green-800">Laba Kotor</span>
            <span className="font-semibold text-green-700 text-base">Rp {labaKotor.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 mt-3">
            <span className="text-gray-700">Biaya Operasional (Pengeluaran Cash Flow)</span>
            <span className="font-medium text-red-600">- Rp {totalBiaya.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center justify-between py-3 bg-[#3B82F6]/10 px-3 rounded-lg">
            <span className="font-semibold text-[#3B82F6] text-base">Laba Bersih</span>
            <span className="font-bold text-[#3B82F6] text-xl">Rp {labaBersih.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
