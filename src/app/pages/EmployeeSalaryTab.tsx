import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, User, DollarSign, History, Gift, MinusCircle, FileText } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Employee {
  id: number;
  name: string;
  position: string;
  base_salary: number;
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
  const [promptModal, setPromptModal] = useState<{isOpen: boolean, id: number | null, name: string, base_salary: string}>({isOpen: false, id: null, name: '', base_salary: ''});
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Form State
  const [form, setForm] = useState({
    employee_id: '',
    tanggal: getCurrentLocalDateTime(),
    gaji_pokok: '',
    bonus: '',
    potongan: '',
    keterangan: ''
  });

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
      const res = await api.get('/salaries', { params: { page, limit: 100 } });
      setSalaries(res.data.data);
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
        tanggal: getCurrentLocalDateTime(),
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

  const handleAddEmployee = () => {
    setPromptModal({ isOpen: true, id: null, name: '', base_salary: '' });
  };

  const handleEditEmployee = (emp: Employee) => {
    setPromptModal({ isOpen: true, id: emp.id, name: emp.name, base_salary: emp.base_salary.toString() });
  };

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = promptModal.name.trim();
    const base_salary = Number(promptModal.base_salary) || 0;
    if (!name) return;

    try {
      if (promptModal.id) {
        await api.put(`/employees/${promptModal.id}`, { name, base_salary });
        toast.success('Data staf diperbarui');
      } else {
        await api.post('/employees', { name, base_salary });
        toast.success('Staf baru ditambahkan');
      }
      fetchEmployees();
      setPromptModal({ isOpen: false, id: null, name: '', base_salary: '' });
    } catch (err: any) {
      toast.error('Gagal menyimpan data staf');
    }
  };

  const getStaffMonthlyStats = (employeeId: number) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthlyPayments = salaries.filter(s => {
      const d = new Date(s.tanggal);
      return s.employee_id === employeeId && d.getMonth() === month && d.getFullYear() === year;
    });

    const totalTaken = monthlyPayments.reduce((sum, s) => sum + Number(s.total), 0);
    return { monthlyPayments, totalTaken };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Manajemen Gaji & Kasbon Karyawan</h2>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">Pantau gaji bulanan, pengambilan kasbon, dan sisa gaji staf.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-fit">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-purple-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">Riwayat Pengeluaran (100 Terakhir)</h3>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
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

        <div className="lg:col-span-7 space-y-4">
           <div className="flex items-center gap-2 mb-1 px-1">
             <User size={16} className="text-purple-600" />
             <h3 className="text-xs font-black uppercase tracking-wider text-gray-600 font-bold">Status Gaji Bulan Ini: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {employees.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl p-8 text-center text-gray-400 dark:text-slate-400 text-xs italic">
                  Belum ada data staf. Tambahkan staf baru di atas.
                </div>
              ) : (
                employees.map((emp, empIdx) => {
                  const { monthlyPayments, totalTaken } = getStaffMonthlyStats(emp.id);
                  const remaining = (Number(emp.base_salary) || 0) - totalTaken;
                  
                  const STAFF_COLORS = [
                    { grad: 'from-blue-600 to-indigo-700', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-blue-300' },
                    { grad: 'from-emerald-500 to-teal-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-emerald-300' },
                    { grad: 'from-rose-500 to-pink-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-rose-300' },
                    { grad: 'from-amber-500 to-orange-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-amber-300' },
                    { grad: 'from-cyan-500 to-blue-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-cyan-300' },
                  ];
                  const c = STAFF_COLORS[empIdx % STAFF_COLORS.length];

                  return (
                    <div key={emp.id} className={`bg-gradient-to-br ${c.grad} rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden hover:shadow-2xl transition-all duration-500 group relative border-t border-white/20`}>
                      {/* Decorative Background Icon */}
                      <div className="absolute top-0 right-0 p-8 opacity-10 -mr-4 -mt-4 text-white">
                         <User size={120} strokeWidth={1} />
                      </div>

                      <div className="p-6 relative z-10 flex flex-col md:flex-row gap-6">
                        {/* Left Side: Summary */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white shadow-inner border border-white/30">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-white tracking-tight">{emp.name}</h4>
                                <p className="text-[10px] text-white/70 uppercase font-black tracking-[0.2em]">{emp.position || 'Staf Operasional'}</p>
                              </div>
                            </div>
                            <button onClick={() => handleEditEmployee(emp)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 group-hover:scale-110">
                              <FileText size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                             <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1.5 leading-none">Gaji Pokok</p>
                                <p className="text-sm font-black text-white">Rp {Number(emp.base_salary).toLocaleString('id-ID')}</p>
                             </div>
                             <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg shadow-black/5">
                                <p className="text-[8px] font-black text-white/80 uppercase tracking-widest mb-1.5 leading-none">Diambil</p>
                                <p className="text-sm font-black text-white">Rp {totalTaken.toLocaleString('id-ID')}</p>
                             </div>
                             <div className={`backdrop-blur-md p-3 rounded-2xl border transition-colors ${remaining < 0 ? 'bg-red-500/40 border-red-400' : 'bg-white/10 border-white/10'}`}>
                                <p className={`text-[8px] font-black tracking-widest uppercase mb-1.5 leading-none ${remaining < 0 ? 'text-white' : 'text-white/60 '}`}>Sisa Gaji</p>
                                <p className="text-sm font-black text-white">Rp {remaining.toLocaleString('id-ID')}</p>
                             </div>
                          </div>
                        </div>

                        {/* Right Side: History Mini List */}
                        <div className="w-full md:w-64 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
                           <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                             <p className="text-[9px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                               <History size={12} className="text-white" /> Aktivitas Bulan Ini
                             </p>
                             <div className="w-1.5 h-1.5 rounded-full bg-white opacity-50 animate-pulse"></div>
                           </div>
                           
                           <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
                              {monthlyPayments.length === 0 ? (
                                <p className="text-[10px] text-white/40 italic py-4 text-center">Belum ada pengambilan dana</p>
                              ) : (
                                monthlyPayments.map(p => (
                                  <div key={p.id} className="flex items-center justify-between group/item">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full ${c.historyLine}`}></div>
                                      <p className="text-[10px] font-bold text-white/90">
                                        {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                      </p>
                                    </div>
                                    <p className="text-[10px] font-black text-white">Rp {Number(p.total).toLocaleString('id-ID')}</p>
                                  </div>
                                ))
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-purple-600 p-5 text-white flex items-center justify-between">
                 <div>
                    <h3 className="text-lg font-black tracking-tight">Input Pembayaran Gaji / Kasbon</h3>
                    <p className="text-purple-100 text-xs opacity-80">Dana akan otomatis memotong Kas Toko secara real-time</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors border-0">
                    <Trash2 size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Pilih Karyawan</label>
                        <select
                          required
                          value={form.employee_id}
                          onChange={(e) => setForm({...form, employee_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                        >
                          <option value="">-- Pilih Staf --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Calendar size={10} /> Tanggal Transaksi
                        </label>
                        <input
                          type="datetime-local"
                          value={form.tanggal}
                          onChange={(e) => setForm({...form, tanggal: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <DollarSign size={10} /> Gaji Pokok
                        </label>
                        <input
                          type="number"
                          value={form.gaji_pokok}
                          onChange={(e) => setForm({...form, gaji_pokok: e.target.value})}
                          placeholder="Rp..."
                          className="w-full px-3 py-2 border border-purple-100 bg-purple-50/30 rounded-lg text-xs font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Gift size={10} /> Bonus / Tambahan
                        </label>
                        <input
                          type="number"
                          value={form.bonus}
                          onChange={(e) => setForm({...form, bonus: e.target.value})}
                          placeholder="Rp..."
                          className="w-full px-3 py-2 border border-emerald-100 bg-emerald-50/30 rounded-lg text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
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
                          className="w-full px-3 py-2 border border-rose-100 bg-rose-50/30 rounded-lg text-xs font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500 font-bold"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                    />
                 </div>

                  <div className="pt-2">
                    {(() => {
                      const total = (Number(form.gaji_pokok) || 0) + (Number(form.bonus) || 0) - (Number(form.potongan) || 0);
                      const isLoan = total < 0;
                      return (
                        <div className={`${isLoan ? 'bg-rose-600 shadow-rose-100' : 'bg-purple-600 shadow-purple-100'} p-4 rounded-xl text-white flex justify-between items-center shadow-lg transition-all`}>
                           <div>
                              <p className="text-[10px] font-black uppercase opacity-70 font-bold">{isLoan ? 'Pinjaman (Uang Keluar)' : 'Total Gaji Bersih'}</p>
                              <p className="text-xl font-black">
                                Rp {Math.abs(total).toLocaleString('id-ID')}
                              </p>
                           </div>
                           <div className="bg-white/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                              {isLoan ? 'Potong Kas Toko' : 'Transfer Kas Toko'}
                           </div>
                        </div>
                      );
                    })()}
                  </div>

                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors border-0 bg-transparent">BATAL</button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-purple-600 py-3 text-xs font-black text-white rounded-lg hover:bg-purple-700 shadow-md shadow-purple-200 disabled:bg-gray-300 transition-colors border-0 uppercase"
                    >
                       {saving ? 'Menyimpan...' : 'Simpan & Potong Kas'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-0">
              <div className="bg-gray-800 p-5 text-white flex items-center justify-between">
                 <h3 className="text-sm font-bold tracking-tight">{promptModal.id ? 'Edit Data Staf' : 'Tambah Staf Baru'}</h3>
              </div>
              <form onSubmit={submitEmployee} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={promptModal.name}
                    onChange={(e) => setPromptModal({...promptModal, name: e.target.value})}
                    placeholder="Masukkan nama staf..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Gaji Bulanan (Acuan Dasar)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={promptModal.base_salary}
                      onChange={(e) => setPromptModal({...promptModal, base_salary: e.target.value})}
                      placeholder="Contoh: 2500000"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 font-medium italic">Gaji ini digunakan sebagai acuan perhitungan "Sisa Gaji" setiap bulannya.</p>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setPromptModal({...promptModal, isOpen: false})} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors border-0 bg-transparent">BATAL</button>
                  <button type="submit" className="flex-1 bg-gray-800 py-3 text-xs font-black text-white rounded-xl hover:bg-gray-900 shadow-large transition-colors border-0 uppercase">
                    {promptModal.id ? 'Update Data' : 'Simpan Staf'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 border-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                 <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-sm font-black text-gray-800 mb-2 uppercase tracking-wide">Hapus Riwayat Gaji?</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">Peringatan: Riwayat transaksi ini juga akan dihapus dari catatan Mutasi Kas Toko secara permanen.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDialog({isOpen: false, id: null})} className="px-5 py-2.5 text-[10px] font-black text-gray-500 hover:bg-gray-100 rounded-xl transition-colors uppercase border-0 bg-transparent">Batal</button>
                <button onClick={executeDelete} className="px-5 py-2.5 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-colors uppercase border-0">Ya, Hapus</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
