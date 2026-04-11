import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Calendar, User, DollarSign, Wallet, History, Gift, MinusCircle, FileText } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Employee {
  id: number;
  name: string;
  position: string;
}

interface Salary {
  id: number;
  employee_id: number;
  tanggal: string;
  gaji_pokok: number;
  bonus: number;
  potongan: number;
  total: number;
  keterangan: string | null;
  employee?: Employee;
}

export default function EmployeeSalaryTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promptModal, setPromptModal] = useState<{isOpen: boolean, value: string}>({isOpen: false, value: ''});
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});

  // Form State
  const [form, setForm] = useState({
    employee_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    gaji_pokok: '',
    bonus: '',
    potongan: '',
    keterangan: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      toast.error('Gagal memuat data karyawan');
    }
  };

  const fetchSalaries = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/salaries', { params: { page, limit: 10 } });
      setSalaries(res.data.data);
      setLastPage(res.data.last_page);
      setCurrentPage(res.data.current_page);
    } catch (err) {
      toast.error('Gagal memuat riwayat gaji');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) return toast.error('Pilih karyawan terlebih dahulu');

    const pokok = Number(form.gaji_pokok) || 0;
    const bonus = Number(form.bonus) || 0;
    const potongan = Number(form.potongan) || 0;
    const total = pokok + bonus - potongan;

    setSaving(true);
    try {
      await api.post('/salaries', {
        ...form,
        gaji_pokok: pokok,
        bonus,
        potongan,
        total
      });
      toast.success('Gaji berhasil dicatat dan memotong kas');
      setShowModal(false);
      setForm({
        employee_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        gaji_pokok: '',
        bonus: '',
        potongan: '',
        keterangan: ''
      });
      fetchSalaries();
    } catch (err) {
      toast.error('Gagal mencatat gaji');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!confirmDialog.id) return;
    try {
      await api.delete(`/salaries/${confirmDialog.id}`);
      toast.success('Riwayat gaji dihapus');
      fetchSalaries();
    } catch (err) {
      toast.error('Gagal menghapus data');
    }
    setConfirmDialog({ isOpen: false, id: null });
  };

  const handleAddEmployee = async () => {
    setPromptModal({ isOpen: true, value: '' });
  };

  const submitAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = promptModal.value.trim();
    if (!name) return;
    try {
      await api.post('/employees', { name });
      fetchEmployees();
      toast.success('Karyawan ditambahkan');
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0] as string[];
        toast.error(firstError[0]);
      } else {
        toast.error('Gagal menambahkan karyawan');
      }
    }
    setPromptModal({ isOpen: false, value: '' });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Manajemen Gaji & Kasbon Karyawan</h2>
          <p className="text-gray-500 mt-0.5 text-xs">Catat gaji pokok, bonus, dan potongan staf secara fleksibel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddEmployee}
            className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-bold text-xs shadow-sm"
          >
            <User size={14} />
            + Staf Baru
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-bold text-xs shadow-md shadow-purple-200"
          >
            <Plus size={14} />
            Input Gaji / Pinjaman
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Salary History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <History size={16} className="text-purple-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">Riwayat Pengeluaran Gaji</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">TGL</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Karyawan</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                   <tr><td colSpan={4} className="p-4 text-center text-xs text-gray-400">Loading...</td></tr>
                ) : salaries.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-xs text-gray-400 italic">Belum ada riwayat gaji</td></tr>
                ) : (
                  salaries.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-bold text-gray-600">
                        {new Date(s.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-800">{s.employee?.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{s.keterangan || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-black text-purple-600">Rp {Number(s.total).toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="space-y-4">
           {salaries.length > 0 && (
             <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-200">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Transaksi Gaji Terakhir</p>
                <div className="flex items-end justify-between">
                   <div>
                      <p className="text-2xl font-black">Rp {Number(salaries[0].total).toLocaleString('id-ID')}</p>
                      <p className="text-xs font-bold opacity-90 mt-1">{salaries[0].employee?.name}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded w-fit ml-auto mb-2 uppercase tracking-tighter">Verified</p>
                      <p className="text-[10px] opacity-70 italic">{new Date(salaries[0].tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
                   <div>
                      <p className="text-[8px] font-black uppercase opacity-60">Pokok</p>
                      <p className="text-xs font-bold">Rp {Number(salaries[0].gaji_pokok).toLocaleString('id-ID')}</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase opacity-60">Bonus</p>
                      <p className="text-xs font-bold">Rp {Number(salaries[0].bonus).toLocaleString('id-ID')}</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase opacity-60">Potongan</p>
                      <p className="text-xs font-bold">Rp {Number(salaries[0].potongan).toLocaleString('id-ID')}</p>
                   </div>
                </div>
             </div>
           )}

           <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <FileText size={40} className="text-gray-200 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                Detail per rincian gaji akan otomatis disinkronkan <br/> ke buku besar mutasi kas (biaya operasional).
              </p>
           </div>
        </div>
      </div>

      {/* Modal Input Gaji */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/30">
                 <h3 className="text-sm font-black text-purple-700 uppercase tracking-wider">Input Gaji / Bonus / Pinjaman</h3>
                 <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">×</button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Pilih Karyawan</label>
                    <select
                      value={form.employee_id}
                      onChange={(e) => setForm({...form, employee_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                      required
                    >
                       <option value="">-- Pilih Staf --</option>
                       {employees.map(e => (
                         <option key={e.id} value={e.id}>{e.name}</option>
                       ))}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Tanggal</label>
                        <input
                          type="date"
                          value={form.tanggal}
                          onChange={(e) => setForm({...form, tanggal: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                          required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Gaji Pokok</label>
                        <input
                          type="number"
                          value={form.gaji_pokok}
                          onChange={(e) => setForm({...form, gaji_pokok: e.target.value})}
                          placeholder="Rp..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Gift size={10} /> Bonus / Tambahan
                        </label>
                        <input
                          type="number"
                          value={form.bonus}
                          onChange={(e) => setForm({...form, bonus: e.target.value})}
                          placeholder="Rp..."
                          className="w-full px-3 py-2 border border-emerald-100 bg-emerald-50/30 rounded-lg text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <MinusCircle size={10} /> Potongan / Pinjam
                        </label>
                        <input
                          type="number"
                          value={form.potongan}
                          onChange={(e) => setForm({...form, potongan: e.target.value})}
                          placeholder="Rp..."
                          className="w-full px-3 py-2 border border-rose-100 bg-rose-50/30 rounded-lg text-xs font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Keterangan Tambahan</label>
                    <input
                      type="text"
                      value={form.keterangan}
                      onChange={(e) => setForm({...form, keterangan: e.target.value})}
                      placeholder="Contoh: Bonus target lebaran"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none"
                    />
                 </div>

                 <div className="pt-2">
                    <div className="bg-purple-600 p-4 rounded-xl text-white flex justify-between items-center shadow-lg shadow-purple-100">
                       <div>
                          <p className="text-[10px] font-black uppercase opacity-70">Total Dibayarkan</p>
                          <p className="text-xl font-black">
                            Rp {((Number(form.gaji_pokok) || 0) + (Number(form.bonus) || 0) - (Number(form.potongan) || 0)).toLocaleString('id-ID')}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">BATAL</button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-purple-600 py-3 text-xs font-black text-white rounded-lg hover:bg-purple-700 shadow-md shadow-purple-200 disabled:bg-gray-300 transition-colors uppercase"
                    >
                       {saving ? 'Menyimpan...' : 'Simpan & Potong Kas'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Nama Karyawan Baru</h3>
              <form onSubmit={submitAddEmployee}>
                <input
                  type="text"
                  autoFocus
                  required
                  value={promptModal.value}
                  onChange={(e) => setPromptModal({...promptModal, value: e.target.value})}
                  placeholder="Masukkan nama..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:ring-1 focus:ring-purple-500"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setPromptModal({isOpen: false, value: ''})} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg">Simpan</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Hapus Riwayat Gaji?</h3>
              <p className="text-xs text-gray-500 mb-5">Riwayat transaksi pemotongan gaji di buku kas juga akan ikut terhapus.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDialog({isOpen: false, id: null})} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={executeDelete} className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Ya, Hapus</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
