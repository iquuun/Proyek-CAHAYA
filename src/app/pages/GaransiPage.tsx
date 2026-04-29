import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';

interface Warranty {
  id: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  tanggal_pembelian?: string | null;
  tanggal_masuk: string;
  status: 'diterima_toko' | 'proses_distributor' | 'dikirim_ke_customer';
  nomor_resi?: string | null;
  catatan: string;
  distributor_name?: string | null;
  tanggal_kirim_distributor?: string | null;
}

interface Distributor {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
}

const statusColors: Record<Warranty['status'], string> = {
  diterima_toko: 'bg-blue-100 text-blue-700',
  proses_distributor: 'bg-orange-100 text-orange-700',
  dikirim_ke_customer: 'bg-green-100 text-green-700',
};

const statusLabels: Record<Warranty['status'], string> = {
  diterima_toko: 'Diterima Toko',
  proses_distributor: 'Proses Distributor',
  dikirim_ke_customer: 'Dikirim ke Customer',
};

export default function GaransiPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Warranty['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    product_name: '',
    tanggal_pembelian: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    status: 'diterima_toko' as Warranty['status'],
    nomor_resi: '',
    catatan: '',
    distributor_name: '',
    tanggal_kirim_distributor: '',
  });

  useEffect(() => {
    fetchWarranties();
    fetchDistributors();
    fetchProducts();
  }, []);

  // Close product dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warranties');
      setWarranties(res.data);
    } catch (err) {
      toast.error('Gagal memuat data garansi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const res = await api.get('/distributors');
      setDistributors(res.data);
    } catch (err) {
      console.error('Gagal memuat distributor:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', warranty?: Warranty) => {
    setModalMode(mode);
    if (warranty) {
      setCurrentId(warranty.id);
      setFormData({
        customer_name: warranty.customer_name,
        customer_phone: warranty.customer_phone,
        product_name: warranty.product_name,
        tanggal_pembelian: warranty.tanggal_pembelian ? warranty.tanggal_pembelian.substring(0, 10) : '',
        tanggal_masuk: warranty.tanggal_masuk.substring(0, 10),
        status: warranty.status,
        nomor_resi: warranty.nomor_resi || '',
        catatan: warranty.catatan || '',
        distributor_name: warranty.distributor_name || '',
        tanggal_kirim_distributor: warranty.tanggal_kirim_distributor || '',
      });
      setProductSearch(warranty.product_name);
    } else {
      setCurrentId(null);
      setFormData({
        customer_name: '',
        customer_phone: '',
        product_name: '',
        tanggal_pembelian: '',
        tanggal_masuk: new Date().toISOString().split('T')[0],
        status: 'diterima_toko',
        nomor_resi: '',
        catatan: '',
        distributor_name: '',
        tanggal_kirim_distributor: '',
      });
      setProductSearch('');
    }
    setShowProductDropdown(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Build the payload, only include non-empty optional fields
      const payload: Record<string, string> = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        product_name: formData.product_name,
        tanggal_masuk: formData.tanggal_masuk,
        status: formData.status,
      };

      if (formData.tanggal_pembelian) payload.tanggal_pembelian = formData.tanggal_pembelian;
      if (formData.catatan) payload.catatan = formData.catatan;
      if (formData.nomor_resi) payload.nomor_resi = formData.nomor_resi;
      if (formData.distributor_name) payload.distributor_name = formData.distributor_name;
      if (formData.tanggal_kirim_distributor) payload.tanggal_kirim_distributor = formData.tanggal_kirim_distributor;

      if (modalMode === 'add') {
        await api.post('/warranties', payload);
      } else {
        await api.put(`/warranties/${currentId}`, payload);
      }
      toast.success(modalMode === 'add' ? 'Garansi berhasil ditambah' : 'Garansi berhasil diupdate');
      handleCloseModal();
      fetchWarranties();
    } catch (err: any) {
      console.error('Warranty save error:', err?.response?.data || err);
      const message = err?.response?.data?.message || 'Gagal menyimpan garansi';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus data garansi ini?')) {
      try {
        await api.delete(`/warranties/${id}`);
        toast.success('Garansi berhasil dihapus');
        fetchWarranties();
      } catch (err) {
        toast.error('Gagal menghapus garansi');
      }
    }
  };

  // Product search filter
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleProductSelect = (productName: string) => {
    setFormData({ ...formData, product_name: productName });
    setProductSearch(productName);
    setShowProductDropdown(false);
  };

  const filteredWarranties = warranties.filter(
    (w) => filter === 'all' || w.status === filter
  );

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-40 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="flex gap-3"><div className="flex-1 h-9 bg-gray-200 rounded-lg" /><div className="w-48 h-9 bg-gray-200 rounded-lg" /></div></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Manajemen Garansi</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola klaim garansi produk customer</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          <Plus size={14} />
          Tambah Garansi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = warranties.filter((w) => w.status === status).length;
          return (
            <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">{label}</p>
              <p className="text-xl font-bold text-[#3B82F6]">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semua
          </button>
          {Object.keys(statusLabels).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as Warranty['status'])}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === status
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status as Warranty['status']]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Customer</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Produk</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tgl Beli</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Distributor</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tgl Masuk</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tgl Kirim Dist.</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Status</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Catatan</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWarranties.map((warranty) => (
                <tr key={warranty.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 text-xs">
                    <p className="font-bold text-xs text-gray-800">{warranty.customer_name}</p>
                    <p className="text-[10px] text-gray-500">{warranty.customer_phone}</p>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-gray-700">{warranty.product_name}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {warranty.tanggal_pembelian
                      ? new Date(warranty.tanggal_pembelian).toLocaleDateString('id-ID')
                      : <span className="text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {warranty.distributor_name ? (
                      <span className="font-medium text-gray-700">{warranty.distributor_name}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {new Date(warranty.tanggal_masuk).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {warranty.tanggal_kirim_distributor
                      ? new Date(warranty.tanggal_kirim_distributor).toLocaleDateString('id-ID')
                      : <span className="text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        statusColors[warranty.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {statusLabels[warranty.status] || warranty.status}
                    </span>
                    {warranty.nomor_resi && (
                      <p className="text-[10px] text-gray-500 mt-1 font-medium">
                        Resi: <span className="font-bold">{warranty.nomor_resi}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{warranty.catatan || '-'}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleOpenModal('edit', warranty)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(warranty.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredWarranties.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-xs">Belum ada garansi!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-md overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50 text-center">
              <h3 className="text-sm font-bold text-gray-800">
                {modalMode === 'add' ? 'Tambah Data Garansi' : 'Edit Garansi'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nama Customer</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">No. HP/WA</label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                  />
                </div>
              </div>

              {/* Product Name - searchable from database */}
              <div ref={productDropdownRef} className="relative">
                <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nama Produk (Seri/Model)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setFormData({ ...formData, product_name: e.target.value });
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Ketik untuk cari produk..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                  />
                </div>
                {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product.name)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        {product.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tanggal Pembelian */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Tanggal Pembelian</label>
                <input
                  type="date"
                  value={formData.tanggal_pembelian}
                  onChange={(e) => setFormData({ ...formData, tanggal_pembelian: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                />
              </div>

              {/* Distributor */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Distributor Tujuan Garansi</label>
                <select
                  value={formData.distributor_name}
                  onChange={(e) => setFormData({ ...formData, distributor_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                >
                  <option value="">-- Pilih Distributor --</option>
                  {distributors.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Tgl Masuk ke Toko</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_masuk}
                    onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Status Garansi</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Warranty['status'] })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tanggal kirim distributor — tampil jika proses_distributor atau dikirim_ke_customer */}
              {(formData.status === 'proses_distributor' || formData.status === 'dikirim_ke_customer') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Tgl Kirim ke Distributor</label>
                    <input
                      type="date"
                      value={formData.tanggal_kirim_distributor}
                      onChange={(e) => setFormData({ ...formData, tanggal_kirim_distributor: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nomor Resi (Opsional)</label>
                    <input
                      type="text"
                      value={formData.nomor_resi}
                      onChange={(e) => setFormData({ ...formData, nomor_resi: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                      placeholder="Contoh: JNT123456789"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Catatan/Kerusakan</label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                  placeholder="Deskripsi kerusakan..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50 text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
