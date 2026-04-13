import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Trash2, X, Wallet, Search, ChevronLeft, ChevronRight, Activity, Banknote } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface CashFlow {
  id: number;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  sumber: string;
  nominal: number;
  keterangan: string | null;
  staff_user_id: number | null;
  staff_name: string | null;
}

interface User {
  id: number;
  name: string;
  role: string;
}

const SUMBER_MASUK = [
  { value: 'offline', label: 'Penjualan Offline / Toko' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'biaya_umum', label: 'Pemasukan Lainnya' },
];

const SUMBER_KELUAR = [
  { value: 'bayar_distributor', label: 'Bayar Distributor / Hutang' },
  { value: 'biaya_operasional', label: 'Biaya Operasional' },
  { value: 'biaya_umum', label: 'Pengeluaran Lainnya' },
];

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

export default function MutasiRekeningTab() {
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [biayaOperasional, setBiayaOperasional] = useState(0);
  const [saldo, setSaldo] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const getLocalYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [filterValue, setFilterValue] = useState(() => getLocalYMD(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Form state
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    tanggal: getCurrentLocalDateTime(),
    tipe: 'masuk' as 'masuk' | 'keluar',
    sumber: 'offline',
    nominal: '',
    keterangan: '',
    staff_user_id: '' as string | number,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Since we handle time filtering dynamically here for standard times, 
    // we only need to pass the month filter if 'month' is exactly selected to speed up large data
    // Or we rely on local compute if data is small.
    // For now we pass bulan to get accurate summary from backend for the selected month to keep it standard
    let bulan = '';
    if (timeFilter === 'month') {
        bulan = filterValue.substring(0, 7);
    }
    try {
      const res = await api.get('/cash-flows', {
        params: { tipe: filterType, bulan },
      });
      setCashFlows(res.data.data);
      setTotalMasuk(res.data.total_masuk);
      setTotalKeluar(res.data.total_keluar);
      setBiayaOperasional(res.data.biaya_operasional || 0);
      setSaldo(res.data.saldo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterType, timeFilter, filterValue]);

  useEffect(() => {
    fetchData();
    // Fetch users for staff selection
    api.get('/users').then(res => setUsers(res.data)).catch(() => {});
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, timeFilter, filterValue]);

  // Dynamic Time Filter logic based on fetched data
  const filteredFlows = useMemo(() => {
    return cashFlows.filter(f => {
      // Time Filter
      const flowDateStr = f.tanggal.substring(0, 10); // YYYY-MM-DD
      const selectedDate = new Date(filterValue);
      
      if (timeFilter === 'today') {
        if (flowDateStr !== filterValue) return false;
      } else if (timeFilter === 'week') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        const flowDate = new Date(flowDateStr);
        if (flowDate < startOfWeek || flowDate > endOfWeek) return false;
      } else if (timeFilter === 'month') {
          // Already filtered mostly by backend but good to be safe if caching changes
          const currentMonth = filterValue.substring(0, 7);
          if (!flowDateStr.startsWith(currentMonth)) return false;
      }

      // Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        return (
          (f.keterangan || '').toLowerCase().includes(search) ||
          (f.sumber || '').toLowerCase().includes(search)
        );
      }
      return true;
    }).sort((a, b) => {
      const timeDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      return timeDiff !== 0 ? timeDiff : b.id - a.id;
    });
  }, [cashFlows, searchTerm, timeFilter, filterValue]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredFlows.length / itemsPerPage) || 1;
  const currentFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/cash-flows', {
        ...form,
        nominal: Number(form.nominal),
      });
      setShowModal(false);
      setForm({ tanggal: getCurrentLocalDateTime(), tipe: 'masuk', sumber: 'offline', nominal: '', keterangan: '', staff_user_id: '' });
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan. Periksa kembali data yang diisi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/cash-flows/${id}`);
      fetchData();
    } catch {
      toast.error('Gagal menghapus data.');
    }
  };

  const sumberOptions = form.tipe === 'masuk' ? SUMBER_MASUK : SUMBER_KELUAR;

  // Real-time calculation if not month
  let displayMasuk = totalMasuk;
  let displayKeluar = totalKeluar;
  let displayOps = biayaOperasional;
  let displaySaldo = saldo;

  if (timeFilter !== 'month' && timeFilter !== 'all') {
      displayMasuk = filteredFlows.filter(f => f.tipe === 'masuk').reduce((acc, f) => acc + Math.abs(Number(f.nominal)), 0);
      displayKeluar = filteredFlows.filter(f => f.tipe === 'keluar').reduce((acc, f) => acc + Math.abs(Number(f.nominal)), 0);
      displayOps = filteredFlows.filter(f => f.sumber === 'biaya_operasional' && f.tipe === 'keluar').reduce((acc, f) => acc + Math.abs(Number(f.nominal)), 0);
      displaySaldo = displayMasuk - displayKeluar;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Arus Kas & Operasional </h2>
          <p className="text-gray-500 mt-0.5 text-xs">Kelola arus kas masuk dan keluar beserta biaya operasional</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#3B82F6] text-white px-4 py-2.5 rounded-lg hover:bg-[#2563EB] transition-colors font-medium shadow-md shadow-blue-200"
        >
          <Plus size={14} />
          Tambah Transaksi
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Kas Masuk"
          value={`Rp ${displayMasuk.toLocaleString('id-ID')}`}
          subtitle="Seluruh pemasukan"
          icon={TrendingUp}
          colorClass="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Total Kas Keluar"
          value={`Rp ${displayKeluar.toLocaleString('id-ID')}`}
          subtitle="Seluruh pengeluaran"
          icon={TrendingDown}
          colorClass="from-rose-500 to-rose-600"
        />
        <StatCard
          title="Biaya Operasional"
          value={`Rp ${displayOps.toLocaleString('id-ID')}`}
          subtitle="Pengeluaran operasional toko"
          icon={Activity}
          colorClass="from-amber-500 to-amber-600"
        />
        <StatCard
          title="Saldo Kas Bersih"
          value={`Rp ${displaySaldo.toLocaleString('id-ID')}`}
          subtitle="Sisa dari mutasi"
          icon={Wallet}
          colorClass="from-blue-600 to-blue-700"
        />
      </div>

      {/* Sisa Kas Highlight Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-200/50 relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 group-hover:scale-110 transition-transform">
           <Banknote size={80} strokeWidth={1} className="text-white" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse ring-4 ring-white/20"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
             NERACA {timeFilter === 'today' ? 'HARIAN' : timeFilter === 'week' ? 'MINGGUAN' : timeFilter === 'month' ? 'BULANAN' : 'KESELURUHAN'}
          </span>
        </div>
        <div className="text-right relative z-10">
           <p className="text-[9px] font-bold text-blue-100 uppercase leading-none mb-1 opacity-70">POSISI KAS AKHIR</p>
           <p className="text-2xl font-black text-white tracking-tight">Rp {displaySaldo.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters & Time Selection */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Main Select Scale */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200">
             {(['all', 'masuk', 'keluar'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    filterType === f 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-500 hover:bg-white hover:text-blue-600'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f === 'masuk' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200">
            {[
              { id: 'today', label: 'Harian' },
              { id: 'week', label: 'Mingguan' },
              { id: 'month', label: 'Bulanan' },
              { id: 'all', label: 'Semua' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timeFilter === f.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-white hover:text-indigo-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Dynamic Navigation Picker */}
          {timeFilter !== 'all' && (
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200">
              <button 
                onClick={() => {
                  const d = new Date(filterValue);
                  if (timeFilter === 'today') d.setDate(d.getDate() - 1);
                  else if (timeFilter === 'week') d.setDate(d.getDate() - 7);
                  else if (timeFilter === 'month') d.setMonth(d.getMonth() - 1);
                  setFilterValue(getLocalYMD(d));
                }}
                className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              <input
                type={timeFilter === 'month' ? 'month' : 'date'}
                value={timeFilter === 'month' ? filterValue.substring(0, 7) : filterValue}
                onChange={(e) => {
                  let val = e.target.value;
                  if (timeFilter === 'month') val += "-01";
                  setFilterValue(val);
                }}
                className="bg-transparent text-xs font-black text-indigo-600 outline-none uppercase text-center w-28"
              />

              <button 
                onClick={() => {
                  const d = new Date(filterValue);
                  if (timeFilter === 'today') d.setDate(d.getDate() + 1);
                  else if (timeFilter === 'week') d.setDate(d.getDate() + 7);
                  else if (timeFilter === 'month') d.setMonth(d.getMonth() + 1);
                  setFilterValue(getLocalYMD(d));
                }}
                className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari keterangan mutasi..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Memuat data...</div>
        ) : currentFlows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-sm">Belum ada data arus kas untuk filter ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Sumber Kategori</th>
                  <th className="text-right px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Nominal</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Keterangan</th>
                  <th className="text-center px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentFlows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-blue-50/20 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <p className="font-bold">{new Date(flow.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(flow.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${flow.tipe === 'masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                        {flow.tipe === 'masuk' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {flow.tipe === 'masuk' ? 'MASUK' : 'KELUAR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-800 capitalize">
                       {flow.sumber.replace(/_/g, ' ')}
                       {flow.sumber === 'biaya_operasional' && (
                         <span className="ml-2 inline-flex border border-amber-200 text-amber-600 px-1.5 py-0.5 text-[9px] rounded uppercase bg-amber-50">OPS</span>
                       )}
                       {flow.sumber === 'gaji_karyawan' && (
                         <span className="ml-2 inline-flex border border-purple-200 text-purple-600 px-1.5 py-0.5 text-[9px] rounded uppercase bg-purple-50">GAJI</span>
                       )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <span className={`font-black text-sm ${flow.tipe === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {flow.tipe === 'masuk' ? '+' : '-'} Rp {Math.abs(Number(flow.nominal)).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                      {flow.keterangan || '-'}
                      {flow.staff_name && (
                        <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase italic">Staf: {flow.staff_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <button
                        onClick={() => handleDelete(flow.id)}
                        className="text-red-400 hover:text-red-700 transition-colors p-1.5 rounded hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && currentFlows.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
            <p className="text-[10px] text-gray-500 font-medium">
              Menampilkan {currentFlows.length} dari {filteredFlows.length} mutasi
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
                      className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${
                        currentPage === p
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
        )}
      </div>

      {/* Modal Tambah */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50 p-3">
        <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Tambah Transaksi Operasional / Kas</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Tipe Transaksi</label>
                <div className="flex gap-3">
                  {(['masuk', 'keluar'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipe: t, sumber: t === 'masuk' ? 'offline' : 'biaya_operasional' })}
                      className={`flex-1 py-3 rounded-lg font-black text-xs transition-colors tracking-wider ${form.tipe === t
                          ? t === 'masuk' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-rose-500 text-white shadow-md shadow-rose-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {t === 'masuk' ? '+ KAS MASUK' : '- KAS KELUAR'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Sumber / Kategori</label>
                <select
                  value={form.sumber}
                  onChange={(e) => setForm({ ...form, sumber: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium capitalize"
                >
                  {sumberOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {form.sumber === 'gaji_karyawan' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-purple-600">Pilih Staf / Karyawan</label>
                  <select
                    value={form.staff_user_id}
                    onChange={(e) => setForm({ ...form, staff_user_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-purple-200 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-purple-700"
                    required={form.sumber === 'gaji_karyawan'}
                  >
                    <option value="">-- PILIH STAF --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Nominal (Rp)</label>
                <input
                  type="number"
                  value={form.nominal}
                  onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                  placeholder="Contoh: 500000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold"
                  min={1}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Misal: Pembayaran listrik bulan Maret"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:bg-gray-300 transition-colors uppercase tracking-wider shadow-md shadow-blue-200"
                >
                  {saving ? 'MENYIMPAN...' : 'SIMPAN TRANSAKSI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
