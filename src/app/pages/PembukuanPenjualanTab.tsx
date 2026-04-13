import { useState, useEffect, useMemo } from 'react';
import { Edit2, CheckCircle, Save, X, Search, ChevronLeft, ChevronRight, ShoppingCart, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Sale {
  id: number;
  tanggal: string;
  invoice: string;
  channel: string;
  total_penjualan: number;
  nama_barang_manual: string | null;
  username_pembeli: string | null;
  harga_modal_manual: number | null;
  masuk_dp: number | null;
  keluar_tf: number | null;
  status_pencairan: 'belum' | 'lunas';
  is_verified: boolean;
  items: Array<{ qty: number }>;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  className?: string;
  colorClass?: string;
  iconBgClass?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, colorClass = "from-blue-600 to-blue-700" }: { title: string; value: string; subtitle: string; icon: React.ElementType; colorClass?: string }) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-2xl shadow-lg border-t border-white/20 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden text-white`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">
        <Icon size={64} strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{title}</p>
        <p className="text-2xl font-black tracking-tight mb-2">{value}</p>
        <div className="flex items-center gap-1.5 py-1 px-2.5 bg-white/10 rounded-lg w-fit backdrop-blur-sm border border-white/5">
           <Icon size={12} className="opacity-70" />
           <p className="text-[10px] font-bold opacity-90">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function PembukuanPenjualanTab() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode tracking
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nama_barang_manual: '',
    username_pembeli: '',
    harga_modal_manual: 0,
    masuk_dp: 0,
    keluar_tf: 0
  });
  const [saving, setSaving] = useState(false);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const start = new Date();
    start.setMonth(today.getMonth() - 1);
    return {
      preset: 'month', // today, yesterday, week, month, 3month, all, custom
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });
  const applyPreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'today') {
      // default
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start.setMonth(today.getMonth() - 1);
    } else if (preset === '3month') {
      start.setMonth(today.getMonth() - 3);
    } else if (preset === 'all') {
      start = new Date('2020-01-01');
    }
    
    setDateRange({
      preset,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    if (preset !== 'custom') setShowDatePicker(false);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // New Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'lunas' | 'belum'>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  // New Local Checkbox State (Not saved to DB)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      toast.error('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditForm({
      nama_barang_manual: sale.nama_barang_manual || '',
      username_pembeli: sale.username_pembeli || '',
      harga_modal_manual: sale.harga_modal_manual || 0,
      masuk_dp: sale.masuk_dp || 0,
      keluar_tf: sale.keluar_tf || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    try {
      setSaving(true);
      const masukDP = Number(editForm.masuk_dp);
      const keluarTF = Number(editForm.keluar_tf);
      const isLunas = (masukDP > 0 && keluarTF >= masukDP) ? 'lunas' : 'belum';
      
      const payload = {
        ...editForm,
        status_pencairan: isLunas
      };

      await api.put(`/sales/${id}`, payload);
      toast.success('Pembukuan berhasil diperbarui');
      setEditingId(null);
      fetchSales();
    } catch (err) {
      toast.error('Gagal menyimpan pembukuan');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (id: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedItems(newChecked);
  };

  // Filtering Logic
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Dynamic Date Range Filter
      const saleDateStr = s.tanggal.split(' ')[0]; // YYYY-MM-DD
      const saleDate = new Date(saleDateStr);
      saleDate.setHours(0,0,0,0);
      
      if (dateRange.preset !== 'all') {
         const start = new Date(dateRange.start);
         start.setHours(0,0,0,0);
         const end = new Date(dateRange.end);
         end.setHours(23,59,59,999);
         if (saleDate < start || saleDate > end) return false;
      }

      // Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        const matchesSearch = (
          s.invoice.toLowerCase().includes(search) ||
          (s.nama_barang_manual || '').toLowerCase().includes(search) ||
          (s.username_pembeli || '').toLowerCase().includes(search) ||
          s.channel.toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      // Status Filter
      if (filterStatus !== 'all') {
        const isLunas = (Number(s.masuk_dp) > 0 && Number(s.keluar_tf) >= Number(s.masuk_dp));
        if (filterStatus === 'lunas' && !isLunas) return false;
        if (filterStatus === 'belum' && isLunas) return false;
      }

      // Channel Filter
      if (filterChannel !== 'all' && s.channel !== filterChannel) return false;

      return true;
    });
  }, [sales, searchTerm, dateRange, filterStatus, filterChannel]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // Calculations for Stats (Based on filtered data)
  const totalOmzet = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.total_penjualan), 0), [filteredSales]);
  const totalNet = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.masuk_dp || 0), 0), [filteredSales]);
  const totalHpp = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.harga_modal_manual || 0), 0), [filteredSales]);
  const totalAdm = useMemo(() => filteredSales.reduce((sum, s) => {
    if (s.channel !== 'UMUM' && Number(s.masuk_dp) > 0) {
      return sum + (Number(s.total_penjualan) - Number(s.masuk_dp));
    }
    return sum;
  }, 0), [filteredSales]);
  
  const totalLabaBersih = totalNet - totalHpp; // Margin is now Sales - HPP - ADM which is equal to Net - HPP if Net = Sales - ADM
  const totalHutangMarket = useMemo(() => {
    return filteredSales
      .filter(s => {
        const isLunas = (Number(s.masuk_dp) > 0 && Number(s.keluar_tf) >= Number(s.masuk_dp));
        return !isLunas && Number(s.masuk_dp) > 0;
      })
      .reduce((sum, s) => sum + (Number(s.masuk_dp) - Number(s.keluar_tf || 0)), 0);
  }, [filteredSales]);

  const totalPendapatanHariIni = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(s => s.tanggal.startsWith(today))
      .reduce((sum, s) => sum + Number(s.total_penjualan), 0);
  }, [sales]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="flex gap-3"><div className="h-9 bg-gray-200 rounded-lg w-24" /><div className="h-9 bg-gray-200 rounded-lg w-36" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => (<div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-3 bg-gray-200 rounded w-20 mb-2" /><div className="h-6 bg-gray-200 rounded w-28" /></div>))}</div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Pembukuan Penjualan Online</h2>
          <p className="text-gray-500 mt-0.5 text-xs">Rekap pencairan dana dan sinkronisasi laporan laba jualan Marketplace</p>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Omzet (Gross)"
          value={`Rp ${totalOmzet.toLocaleString('id-ID')}`}
          subtitle="Total nilai penjualan kotor"
          icon={TrendingUp}
          colorClass="from-blue-600 to-blue-700"
        />
        <StatCard
          title="Total Harga Modal (HPP)"
          value={`Rp ${totalHpp.toLocaleString('id-ID')}`}
          subtitle="Modal stok barang terjual"
          icon={ShoppingCart}
          colorClass="from-slate-600 to-slate-700"
        />
        <StatCard
          title="Biaya ADM Market"
          value={`Rp ${totalAdm.toLocaleString('id-ID')}`}
          subtitle="Total potongan marketplace"
          icon={DollarSign}
          colorClass="from-rose-600 to-rose-700"
        />
        <StatCard
          title="Laba Bersih (Profit)"
          value={`Rp ${totalLabaBersih.toLocaleString('id-ID')}`}
          subtitle={`Margin keuntungan (${((totalLabaBersih / (totalOmzet || 1)) * 100).toFixed(1)}%)`}
          icon={TrendingUp}
          colorClass="from-emerald-600 to-emerald-700"
        />
        <StatCard
          title="Hutang Market (Saldo)"
          value={`Rp ${totalHutangMarket.toLocaleString('id-ID')}`}
          subtitle="Dana mengendap belum ditarik"
          icon={Wallet}
          colorClass="from-orange-600 to-orange-700"
        />
      </div>

      {/* Today Highlight Indicator */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-200/50 relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 group-hover:scale-110 transition-transform">
           <ShoppingCart size={80} strokeWidth={1} className="text-white" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse ring-4 ring-white/20"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">STATISTIK OMZET HARI INI</span>
        </div>
        <div className="text-right relative z-10">
           <p className="text-[9px] font-bold text-purple-100 uppercase leading-none mb-1 opacity-70">GROSS REVENUE</p>
           <p className="text-2xl font-black text-white tracking-tight">Rp {totalPendapatanHariIni.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters & Time Selection */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        {/* Search Bar - LEFTSIDE */}
        <div className="relative w-full xl:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari invoice, pembeli..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* PRESET & SPECIFIC FILTERS - RIGHTSIDE */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          {/* DATE RANGE FILTER */}
          <div className="relative w-full xl:w-auto z-20">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 w-full xl:w-[265px] justify-between whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📅</span>
                {dateRange.preset === 'all' ? 'Semua Waktu' : 
                 `${dateRange.start} s/d ${dateRange.end}`}
              </div>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-90' : ''}`} />
            </button>

            {showDatePicker && (
              <div className="absolute top-11 right-0 w-[320px] md:w-[450px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">
                {/* Presets Sidebar */}
                <div className="w-full md:w-40 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col p-2 gap-1 relative z-10">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'yesterday', label: 'Kemarin' },
                    { id: 'week', label: '1 Minggu Terakhir' },
                    { id: 'month', label: '1 Bulan Terakhir' },
                    { id: '3month', label: '3 Bulan Terakhir' },
                    { id: 'all', label: 'Semua Waktu' },
                    { id: 'custom', label: 'Pilih Sendiri' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${dateRange.preset === p.id ? 'bg-[#1D4ED8] text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                
                {/* Custom Date Picker Inputs */}
                <div className="p-4 flex-1 bg-white relative z-10">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-wider">Rentang Waktu</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Mulai Tanggal</label>
                      <input 
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value, preset: 'custom' })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                      <input 
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value, preset: 'custom' })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button 
                      onClick={() => setShowDatePicker(false)}
                      className="w-full mt-2 py-2 bg-[#1D4ED8] text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Terapkan / Tutup
                    </button>
                  </div>
                </div>
                
                {/* Click outside Overlay (Invisible) */}
                <div 
                  className="fixed inset-0 z-0 bg-transparent" 
                  onClick={() => setShowDatePicker(false)}
                  style={{zIndex: -1}}
                />
              </div>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">SEMUA STATUS</option>
            <option value="lunas">LUNAS CAIR</option>
            <option value="belum">BELUM CAIR</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          >
            <option value="all">SEMUA MARKET</option>
            {Array.from(new Set(sales.map(s => s.channel))).sort().map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">#</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tgl / Inv</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nama Barang</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Market / User</th>
                <th className="px-3 py-2 text-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">Cek</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Harga Jual</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Harga Modal</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Bersih</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">ADM</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Masuk/DP</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Keluar/TF</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Sisa Hutang Market</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Pencarian data tidak ditemukan
                  </td>
                </tr>
              ) : (
                currentItems.map((sale, index) => {
                  const totalQty = sale.items.reduce((s, i) => s + Number(i.qty), 0);
                  const isEditing = editingId === sale.id;
                  const isChecked = checkedItems.has(sale.id);

                  // Kalkulasi (Jika tidak ngedit, pakai dari DB. Jika ngedit, pakai form sementara untuk preview realtime)
                  const hrgJual = Number(sale.total_penjualan);
                  const hrgModal = isEditing ? Number(editForm.harga_modal_manual) : Number(sale.harga_modal_manual || 0);
                  const masukDP = isEditing ? Number(editForm.masuk_dp) : Number(sale.masuk_dp || 0);
                  const keluarTF = isEditing ? Number(editForm.keluar_tf) : Number(sale.keluar_tf || 0);

                  const amdMarket = hrgJual - masukDP;
                  const labaBersih = masukDP > 0 ? (masukDP - hrgModal) : 0;
                  const sisa = masukDP - keluarTF;

                  const rowIndex = index + 1 + (currentPage - 1) * itemsPerPage;

                  return (
                    <tr key={sale.id} className={`transition-colors text-xs ${isChecked ? 'bg-blue-50/70 hover:bg-blue-100/70' : 'hover:bg-blue-50/10'}`}>
                      <td className="px-3 py-2 text-center text-gray-400 font-bold">
                         {rowIndex}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-xs font-black text-gray-900 uppercase leading-none">{sale.invoice}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                          {new Date(sale.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.nama_barang_manual}
                            onChange={(e) => setEditForm({ ...editForm, nama_barang_manual: e.target.value })}
                            className="w-32 px-2 py-1 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="PC Rakitan..."
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-gray-800">{sale.nama_barang_manual || '-'}</p>
                            <p className="text-[10px] text-gray-500">Qty: {totalQty}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">{sale.channel}</span>
                        <div className="mt-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.username_pembeli}
                              onChange={(e) => setEditForm({ ...editForm, username_pembeli: e.target.value })}
                              className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Username..."
                            />
                          ) : (
                            <p className="text-xs font-semibold text-[#3B82F6]">{sale.username_pembeli || '-'}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                         <input
                           type="checkbox"
                           checked={isChecked}
                           onChange={() => toggleCheck(sale.id)}
                           className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                         />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">
                        {hrgJual.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.harga_modal_manual}
                            onChange={(e) => setEditForm({ ...editForm, harga_modal_manual: Number(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="text-gray-600">{hrgModal.toLocaleString('id-ID')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${labaBersih > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {labaBersih !== 0 ? labaBersih.toLocaleString('id-ID') : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-orange-600">
                        {amdMarket > 0 && masukDP > 0 ? amdMarket.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50/30">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.masuk_dp}
                            onChange={(e) => setEditForm({ ...editForm, masuk_dp: Number(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="font-semibold text-blue-600">{masukDP > 0 ? masukDP.toLocaleString('id-ID') : '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right bg-purple-50/30">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.keluar_tf}
                            onChange={(e) => setEditForm({ ...editForm, keluar_tf: Number(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="font-semibold text-purple-600">{keluarTF > 0 ? keluarTF.toLocaleString('id-ID') : '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-red-600 font-bold">
                        {sisa > 0 ? sisa.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          (masukDP > 0 && keluarTF >= masukDP) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(masukDP > 0 && keluarTF >= masukDP) ? 'LUNAS' : 'PROSES'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => saveEdit(sale.id)} disabled={saving} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200">
                              <Save size={14} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(sale)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
          <p className="text-[10px] text-gray-500 font-medium">
            Menampilkan {currentItems.length} dari {filteredSales.length} riwayat pembukuan
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-gray-400 text-[10px] px-0.5">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${currentPage === p
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {p}
                  </button>
                </span>
              ))
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
