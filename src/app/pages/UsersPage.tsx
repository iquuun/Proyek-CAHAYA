import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, KeyRound, ShieldCheck, User as UserIcon } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'staf';
}

export default function UsersPage() {
  const { user: currentUser, isOwner } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staf',
    password: '',
  });

  useEffect(() => {
    if (isOwner) {
      fetchUsers();
    }
  }, [isOwner]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  const handleOpenModal = (mode: 'add' | 'edit', u?: UserData) => {
    setModalMode(mode);
    if (u) {
      setCurrentId(u.id);
      setFormData({
        name: u.name,
        email: u.email,
        role: u.role,
        password: '', // Blank by default, filled only if they want to change it
      });
    } else {
      setCurrentId(null);
      setFormData({
        name: '',
        email: '',
        role: 'staf',
        password: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (modalMode === 'add') {
        if (!formData.password) {
          throw new Error('Password wajib diisi untuk pengguna baru.');
        }
        await api.post('/users', formData);
      } else {
        await api.put(`/users/${currentId}`, formData);
      }
      setIsModalOpen(false);
      fetchUsers();
      toast.success(modalMode === 'add' ? 'Akun berhasil dibuat.' : 'Akun berhasil diperbarui.');
    } catch (err: any) {
       console.error(err);
       toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (id.toString() === currentUser?.id?.toString()) {
       toast.error('Anda tidak bisa menghapus akun Anda sendiri.');
       return;
    }
    if (window.confirm('Yakin ingin menghapus akun ini secara permanen?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
        toast.success('Akun berhasil dihapus.');
      } catch (err: any) {
        console.error(err);
        toast.error('Gagal menghapus akun.');
      }
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-48 mb-2" /><div className="h-3 bg-gray-200 rounded w-64" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(4)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-[#3B82F6]" />
            Manajemen Akun Karyawan
          </h2>
          <p className="text-sm text-gray-500 mt-1">Kelola data login staf kasir dan hak akses aplikasi toko Anda.</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#3B82F6]/30 hover:bg-[#2563EB] transition-all active:scale-95"
        >
          <Plus size={18} />
          Tambah Kasir
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-4 text-xs uppercase tracking-wider font-bold text-gray-500">Info Akun</th>
                <th className="text-left px-5 py-4 text-xs uppercase tracking-wider font-bold text-gray-500">Role / Hak Akses</th>
                <th className="text-center px-5 py-4 text-xs uppercase tracking-wider font-bold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      u.role === 'owner' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {u.role === 'owner' ? 'Owner / Admin' : 'Staf Kasir'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal('edit', u)} 
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors tooltip"
                        title="Edit / Ubah Password"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)} 
                        disabled={currentUser?.id?.toString() === u.id.toString()}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Hapus Akun"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <UserIcon className="text-[#3B82F6]" size={20} />
                {modalMode === 'add' ? 'Tambah Akun Kasir' : 'Edit Akun'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                  placeholder="Contoh: Asep Suryana"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Email (Untuk Login)</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                  placeholder="Contoh: asep@cahaya.id"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Hak Akses / Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'owner' | 'staf' })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all font-medium text-gray-700"
                >
                  <option value="staf">Staf Kasir (Hanya Penjualan)</option>
                  <option value="owner">Owner / Admin (Akses Penuh)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 mt-4">
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound size={14} /> Password 
                  {modalMode === 'edit' && <span className="text-[10px] text-gray-400 font-normal normal-case ml-1">(Kosongkan jika tidak ingin diubah)</span>}
                </label>
                <input
                  type="password"
                  required={modalMode === 'add'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                  placeholder={modalMode === 'edit' ? 'Ketik password baru...' : 'Minimal 6 karakter'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] font-bold transition-all shadow-lg shadow-[#3B82F6]/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
