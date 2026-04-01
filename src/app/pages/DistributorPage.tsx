import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, MapPin } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Distributor {
  id: number;
  name: string;
  phone: string;
  address: string;
  purchases_count: number;
  purchases_sum_total_pembelian: number | null;
}

export default function DistributorPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentDistributor, setCurrentDistributor] = useState<Distributor | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/distributors');
      setDistributors(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat distributor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', distributor?: Distributor) => {
    setModalMode(mode);
    setCurrentDistributor(distributor || null);
    setFormData({
      name: distributor?.name || '',
      phone: distributor?.phone || '',
      address: distributor?.address || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDistributor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setIsSubmitting(true);
      if (modalMode === 'add') {
        await api.post('/distributors', formData);
      } else if (modalMode === 'edit' && currentDistributor) {
        await api.put(`/distributors/${currentDistributor.id}`, formData);
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan distributor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus distributor "${name}"?`)) {
      try {
        await api.delete(`/distributors/${id}`);
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menghapus distributor');
      }
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-40 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-9 bg-gray-200 rounded-lg w-full" /></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Data Distributor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola informasi supplier & distributor</p>
        </div>
        <button
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          <Plus size={14} />
          Tambah Distributor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Distributor</p>
          <p className="text-xl font-bold text-[#3B82F6]">{distributors.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Transaksi</p>
          <p className="text-xl font-bold text-[#3B82F6]">
            {distributors.reduce((sum, d) => sum + (d.purchases_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Pembelian</p>
          <p className="text-xl font-bold text-[#3B82F6]">
            Rp{' '}
            {distributors
              .reduce((sum, d) => sum + Number(d.purchases_sum_total_pembelian || 0), 0)
              .toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Distributor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {distributors.map((distributor) => (
          <div
            key={distributor.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800">{distributor.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal('edit', distributor)}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(distributor.id, distributor.name)}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone size={16} />
                <span>{distributor.phone || '-'}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <MapPin size={16} className="mt-0.5" />
                <span>{distributor.address || '-'}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Transaksi</p>
                  <p className="text-sm font-bold text-[#3B82F6]">
                    {distributor.purchases_count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Pembelian</p>
                  <p className="text-sm font-bold text-[#3B82F6]">
                    Rp {(Number(distributor.purchases_sum_total_pembelian || 0) / 1000000).toFixed(1)} Jt
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {distributors.length === 0 && (
          <div className="col-span-full p-5 text-center text-gray-500 bg-white rounded-lg border border-gray-100">
            Belum ada distributor. Silakan tambah baru.
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalMode === 'add' ? 'Tambah Distributor' : 'Edit Distributor'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Distributor
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Contoh: PT. Tech Indonesia"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kontak (No. HP / Telepon)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alamat
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Detail alamat..."
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50"
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
