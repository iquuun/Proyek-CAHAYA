import { useState, useEffect, useMemo } from 'react';
import { Edit2, CheckCircle, Save, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  items: Array<{ qty: number }>;
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
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMonth]);

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
      const isLunas = Number(editForm.keluar_tf) > 0 ? 'lunas' : 'belum';
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

  // Filtering Logic
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Month Filter
      if (filterMonth) {
        const saleMonth = s.tanggal.substring(0, 7); // YYYY-MM
        if (saleMonth !== filterMonth) return false;
      }

      // Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        return (
          s.invoice.toLowerCase().includes(search) ||
          (s.nama_barang_manual || '').toLowerCase().includes(search) ||
          (s.username_pembeli || '').toLowerCase().includes(search) ||
          s.channel.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [sales, searchTerm, filterMonth]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // Calculations for Stats (Based on filtered data)
  const ngendapList = filteredSales.filter(s => s.status_pencairan === 'belum' && Number(s.masuk_dp) > 0);
  const totalNgendap = ngendapList.reduce((sum, s) => sum + (Number(s.masuk_dp) - Number(s.keluar_tf)), 0);
  const totalLabaBersih = filteredSales.reduce((sum, s) => {
    return sum + (Number(s.masuk_dp || 0) - Number(s.harga_modal_manual || 0));
  }, 0);

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200 p-4 text-white">
          <p className="text-xs font-medium opacity-90 mb-1">Total Dana Proses (Belum Cair)</p>
          <p className="text-2xl font-bold">Rp {totalNgendap.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-200 p-4 text-white">
          <p className="text-xs font-medium opacity-90 mb-1">Laba Bersih (Masuk - Modal)</p>
          <p className="text-2xl font-bold">Rp {totalLabaBersih.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari invoice, pembeli, market..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 font-medium">Bulan:</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#3B82F6] outline-none"
          />
          <button
            onClick={() => setFilterMonth('')}
            className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
          >
            Semua
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tgl / Inv</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nama Barang</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Market / User</th>
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
                currentItems.map((sale) => {
                  const totalQty = sale.items.reduce((s, i) => s + Number(i.qty), 0);
                  const isEditing = editingId === sale.id;

                  // Kalkulasi (Jika tidak ngedit, pakai dari DB. Jika ngedit, pakai form sementara untuk preview realtime)
                  const hrgJual = Number(sale.total_penjualan);
                  const hrgModal = isEditing ? Number(editForm.harga_modal_manual) : Number(sale.harga_modal_manual || 0);
                  const masukDP = isEditing ? Number(editForm.masuk_dp) : Number(sale.masuk_dp || 0);
                  const keluarTF = isEditing ? Number(editForm.keluar_tf) : Number(sale.keluar_tf || 0);

                  const amdMarket = hrgJual - masukDP;
                  const labaBersih = masukDP > 0 ? (masukDP - hrgModal) : 0;
                  const sisa = masukDP - keluarTF;

                  return (
                    <tr key={sale.id} className="hover:bg-blue-50/10 text-xs">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-gray-800">{new Date(sale.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                        <p className="text-[10px] text-gray-500">{sale.invoice}</p>
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
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${keluarTF > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {keluarTF > 0 ? 'LUNAS' : 'PROSES'}
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
