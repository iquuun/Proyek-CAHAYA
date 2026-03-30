import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Trash2, X, Wallet, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import api from '../api';
import { toast } from 'sonner';

interface CashFlow {
  id: number;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  sumber: string;
  nominal: number;
  keterangan: string | null;
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

export default function MutasiRekeningTab() {
  const { isOwner } = useAuth();
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [filter, setFilter] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [bulanFilter, setBulanFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Form state
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 16),
    tipe: 'masuk' as 'masuk' | 'keluar',
    sumber: 'offline',
    nominal: '',
    keterangan: '',
  });

  // removed auth check since parent container handles it

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cash-flows', {
        params: { tipe: filter, bulan: bulanFilter },
      });
      setCashFlows(res.data.data);
      setTotalMasuk(res.data.total_masuk);
      setTotalKeluar(res.data.total_keluar);
      setSaldo(res.data.saldo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, bulanFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, bulanFilter, searchTerm]);

  // Filtering Logic
  const filteredFlows = useMemo(() => {
    return cashFlows.filter(f => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        (f.keterangan || '').toLowerCase().includes(search) ||
        (f.sumber || '').toLowerCase().includes(search)
      );
    });
  }, [cashFlows, searchTerm]);

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
      setForm({ tanggal: new Date().toISOString().slice(0, 16), tipe: 'masuk', sumber: 'offline', nominal: '', keterangan: '' });
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan. Periksa kembali data yang diisi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/cash-flows/${id}`);
      fetchData();
    } catch {
      toast.error('Gagal menghapus data.');
    }
  };

  const sumberOptions = form.tipe === 'masuk' ? SUMBER_MASUK : SUMBER_KELUAR;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Mutasi Rekening</h2>
          <p className="text-gray-500 mt-0.5 text-xs">Kelola arus kas masuk dan keluar operasional toko</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg shadow-green-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <p className="text-xs font-medium opacity-90">Total Kas Masuk</p>
          </div>
          <p className="text-2xl font-bold">Rp {totalMasuk.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg shadow-red-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingDown size={22} />
            </div>
            <p className="text-xs font-medium opacity-90">Total Kas Keluar</p>
          </div>
          <p className="text-2xl font-bold">Rp {totalKeluar.toLocaleString('id-ID')}</p>
        </div>
        <div className={`bg-gradient-to-br ${saldo >= 0 ? 'from-[#3B82F6] to-[#2563EB] shadow-blue-200' : 'from-orange-500 to-orange-600 shadow-orange-200'} text-white rounded-xl shadow-lg p-4`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet size={22} />
            </div>
            <p className="text-xs font-medium opacity-90">Saldo Kas</p>
          </div>
          <p className="text-2xl font-bold">Rp {saldo.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari keterangan mutasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'masuk', 'keluar'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {f === 'all' ? 'Semua' : f === 'masuk' ? 'Kas Masuk' : 'Kas Keluar'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-600 font-medium">Bulan:</label>
          <input
            type="month"
            value={bulanFilter}
            onChange={(e) => setBulanFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#3B82F6] outline-none"
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
            <p>Belum ada data cash flow untuk filter ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Sumber</th>
                  <th className="text-right px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Nominal</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Keterangan</th>
                  <th className="text-center px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentFlows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {new Date(flow.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="block text-[11px] text-gray-400">{new Date(flow.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold ${flow.tipe === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {flow.tipe === 'masuk' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {flow.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800 capitalize">{flow.sumber.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      <span className={`font-semibold text-xs ${flow.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
                        {flow.tipe === 'masuk' ? '+' : '-'} Rp {Number(flow.nominal).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{flow.keterangan || '-'}</td>
                    <td className="px-3 py-2 text-center text-xs">
                      <button
                        onClick={() => handleDelete(flow.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
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
              <h3 className="text-base font-bold text-gray-800">Tambah Transaksi Cash Flow</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Tipe */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Transaksi</label>
                <div className="flex gap-3">
                  {(['masuk', 'keluar'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipe: t, sumber: t === 'masuk' ? 'offline' : 'bayar_distributor' })}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-colors ${form.tipe === t
                          ? t === 'masuk' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {t === 'masuk' ? '+ Kas Masuk' : '- Kas Keluar'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs"
                  required
                />
              </div>

              {/* Sumber */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sumber / Kategori</label>
                <select
                  value={form.sumber}
                  onChange={(e) => setForm({ ...form, sumber: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs"
                >
                  {sumberOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={form.nominal}
                  onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                  placeholder="Contoh: 500000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs"
                  min={1}
                  required
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Misal: Pembayaran listrik bulan Maret"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-white font-medium text-xs hover:bg-[#2563EB] disabled:bg-gray-300 transition-colors"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
