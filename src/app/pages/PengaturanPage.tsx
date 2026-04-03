import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Store, MapPin, Database, DownloadCloud, UploadCloud, AlertTriangle, Trash2, Shield, X } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

export default function PengaturanPage() {
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeNotes, setStoreNotes] = useState('');
    const [invoiceStartNumber, setInvoiceStartNumber] = useState('10000');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploadingBackup, setUploadingBackup] = useState(false);
    const backupInputRef = useRef<HTMLInputElement>(null);

    // DANGER ZONE states
    const [showResetModal, setShowResetModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetCountdown, setResetCountdown] = useState(0);
    const [resetting, setResetting] = useState(false);
    const [countdownDone, setCountdownDone] = useState(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (resetCountdown > 0) {
            countdownRef.current = setInterval(() => {
                setResetCountdown(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        setCountdownDone(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => {
                if (countdownRef.current) clearInterval(countdownRef.current);
            };
        }
    }, [resetCountdown > 0]); // eslint-disable-line

    const startResetCountdown = () => {
        if (resetConfirmText !== 'HAPUS SEMUA DATA') {
            toast.error('Ketik persis: HAPUS SEMUA DATA');
            return;
        }
        setCountdownDone(false);
        setResetCountdown(5);
    };

    const handleResetAllData = async () => {
        try {
            setResetting(true);
            const res = await api.post('/system/reset-all-data', {
                confirmation: 'HAPUS SEMUA DATA'
            });
            toast.success(res.data.message || 'Semua data berhasil dihapus!');
            setShowResetModal(false);
            setResetConfirmText('');
            setResetCountdown(0);
            setCountdownDone(false);
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data.');
        } finally {
            setResetting(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setStoreName(res.data.store_name || '');
            setStoreAddress(res.data.store_address || '');
            setStorePhone(res.data.store_phone || '');
            setStoreNotes(res.data.store_notes || '');
            setInvoiceStartNumber(res.data.invoice_start_number || '10000');
            if (res.data.store_logo) {
                const base = api.defaults.baseURL?.endsWith('/api') 
                    ? api.defaults.baseURL.slice(0, -4) 
                    : api.defaults.baseURL?.replace(/\/api$/, '');
                setLogoPreview(`${base}/storage/${res.data.store_logo}?t=${Date.now()}`);
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('store_name', storeName);
            formData.append('store_address', storeAddress);
            formData.append('store_phone', storePhone);
            formData.append('store_notes', storeNotes);
            formData.append('invoice_start_number', invoiceStartNumber);
            if (logoFile) {
                formData.append('store_logo', logoFile);
            }

            await api.post('/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Pengaturan berhasil disimpan!');
            fetchSettings(); // Refresh to get the new logo path or confirm save
        } catch (err) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log("File selected:", file.name);

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.sqlite') && !fileName.endsWith('.db')) {
            toast.error('Format tidak didukung. Harap upload file .sqlite atau .db');
            if (backupInputRef.current) backupInputRef.current.value = '';
            return;
        }

        setPendingRestoreFile(file);
        setShowRestoreModal(true);
        
        // Reset input immediately so same file can be re-selected if needed
        if (e.target) e.target.value = '';
    };

    const confirmRestoreBackup = async () => {
        if (!pendingRestoreFile) return;

        try {
            console.log("Starting restore process...");
            setShowRestoreModal(false);
            setUploadingBackup(true);
            const formData = new FormData();
            formData.append('backup_file', pendingRestoreFile);

            const res = await api.post('/settings/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log("Restore response:", res.data);
            toast.success('Database berhasil dipulihkan! Halaman akan dimuat ulang...');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            console.error("Restore error:", err);
            toast.error(err.response?.data?.message || 'Gagal memulihkan database. Pastikan file valid.');
        } finally {
            setUploadingBackup(false);
            setPendingRestoreFile(null);
        }
    };

    const handleBackup = async () => {
        try {
            setDownloading(true);
            const res = await api.get('/settings/backup', { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = res.headers['content-disposition'];
            let filename = `Backup-CahayaKomputer-${new Date().toISOString().split('T')[0]}.sqlite`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch.length === 2)
                    filename = filenameMatch[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            window.URL.revokeObjectURL(url);
            toast.success('Backup berhasil diunduh! Silakan simpan ke Google Drive Anda.');
        } catch (err) {
            console.error(err);
            toast.error('Gagal men-download backup.');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div><div className="h-5 bg-gray-200 rounded w-24 mb-2" /><div className="h-3 bg-gray-200 rounded w-48" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-40 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200" />
            <div className="md:col-span-2 space-y-4">{[...Array(4)].map((_, i) => (<div key={i}><div className="h-3 bg-gray-200 rounded w-24 mb-2" /><div className="h-10 bg-gray-100 rounded-lg w-full" /></div>))}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div><div className="h-5 bg-gray-200 rounded w-36 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
          </div>
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
                    <div className="p-3 bg-[#3B82F6]/10 rounded-lg text-[#3B82F6]">
                        <Store size={16} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Profil Toko</h2>
                        <p className="text-xs text-gray-500">Atur logo, nama, dan alamat toko Anda untuk nota/faktur.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Logo Upload */}
                    <div className="space-y-4">
                        <label className="block text-xs font-medium text-gray-700">Logo Toko</label>
                        <div className="relative group">
                            <div className="w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-3" />
                                ) : (
                                    <div className="text-center p-3">
                                        <Upload className="mx-auto text-gray-300 mb-2" size={16} />
                                        <p className="text-[11px] text-gray-400">Klik untuk upload logo toko</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Store Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                <Store size={16} className="text-gray-400" /> Nama Toko
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Contoh: CAHAYA KOMPUTER"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                Telepon / WhatsApp
                            </label>
                            <input
                                type="text"
                                value={storePhone}
                                onChange={(e) => setStorePhone(e.target.value)}
                                placeholder="08xxxx..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                Mulai Nomor Faktur
                            </label>
                            <input
                                type="number"
                                value={invoiceStartNumber}
                                onChange={(e) => setInvoiceStartNumber(e.target.value)}
                                placeholder="Contoh: 10000"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                            />
                            <p className="text-[10px] text-gray-400 leading-tight">
                                Faktur selanjutnya akan dimulai dari angka ini (misal: INV-10000) dan terus berlanjut tanpa reset harian.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                <MapPin size={16} className="text-gray-400" /> Alamat Lengkap
                            </label>
                            <textarea
                                value={storeAddress}
                                onChange={(e) => setStoreAddress(e.target.value)}
                                placeholder="Jl. Gajah Mada No. 123..."
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                Keterangan Faktur (Notes)
                            </label>
                            <textarea
                                value={storeNotes}
                                onChange={(e) => setStoreNotes(e.target.value)}
                                placeholder="Keterangan yang akan muncul di bawah faktur..."
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-[#3B82F6] text-white rounded-lg font-bold shadow-lg shadow-[#3B82F6]/30 hover:bg-[#2563EB] disabled:bg-gray-300 transition-all active:scale-95"
                    >
                        <Save size={16} />
                        {saving ? 'Menyimpan...' : 'SIMPAN PENGATURAN'}
                    </button>
                </div>
            </div>

            {/* BACKUP SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-gray-50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
                            <Database size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Backup & Keamanan</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Amankan data toko Anda (Produk, Faktur, Stok) menjadi 1 file.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <label
                            className={`flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95 text-sm cursor-pointer ${uploadingBackup || downloading ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            <input 
                                type="file" 
                                accept=".sqlite,.db" 
                                style={{ display: 'none' }}
                                onChange={handleFileSelection}
                                disabled={uploadingBackup || downloading}
                            />
                            <UploadCloud size={16} />
                            {uploadingBackup ? 'Memulihkan...' : 'Upload Backup (.sqlite)'}
                        </label>
                        <button
                            onClick={handleBackup}
                            disabled={downloading || uploadingBackup}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait transition-all active:scale-95 text-sm"
                        >
                            <DownloadCloud size={16} />
                            {downloading ? 'Memproses...' : 'Download Database (.sqlite)'}
                        </button>
                    </div>
                </div>
                
                <div className="text-xs leading-relaxed bg-amber-50 text-amber-800 p-3.5 rounded-lg border border-amber-200">
                    <strong className="block mb-1 text-amber-900">💡 Tips Penting (Wajib Dibaca):</strong> 
                    Klik tombol di atas untuk mengunduh seluruh data aplikasi. <strong>File backup yang terdownload WAJIB Anda pindahkan / seret ke dalam <span className="underline">Google Drive</span> atau simpan di Flashdisk Anda!</strong> Lakukan proses ini secara rutin <strong>minimal 1 minggu sekali</strong> untuk berjaga-jaga apabila komputer/laptop kasir ini mengalami kerusakan/mati total di kemudian hari.
                </div>
            </div>

            {/* ============================== */}
            {/* DANGER ZONE */}
            {/* ============================== */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-5 mt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-red-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/10 rounded-lg text-red-600">
                            <AlertTriangle size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-red-700">Zona Berbahaya</h2>
                            <p className="text-xs text-red-400 mt-0.5">Tindakan di bawah ini tidak dapat dibatalkan. Harap berhati-hati!</p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                <Trash2 size={14} />
                                Hapus Semua Data
                            </h3>
                            <p className="text-xs text-red-600/70 mt-1 leading-relaxed">
                                Menghapus seluruh data transaksi, produk, kategori, pembelian, penjualan, garansi, dan stok opname. 
                                <strong> Akun pengguna dan pengaturan toko akan tetap disimpan.</strong>
                            </p>
                        </div>
                        <button
                            onClick={() => { setShowResetModal(true); setResetConfirmText(''); setResetCountdown(0); setCountdownDone(false); }}
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 text-sm"
                        >
                            <Trash2 size={14} />
                            Hapus Semua Data
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================== */}
            {/* RESET CONFIRMATION MODAL */}
            {/* ============================== */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content overflow-hidden">
                        {/* Header */}
                        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Shield className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Konfirmasi Penghapusan</h3>
                                    <p className="text-xs text-red-200">Tindakan ini TIDAK DAPAT dibatalkan</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowResetModal(false); setResetCountdown(0); }} className="text-white/70 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                                <p className="text-xs text-red-700 leading-relaxed">
                                    <strong className="block mb-1">⚠️ Peringatan Serius:</strong>
                                    Semua data berikut akan <strong>DIHAPUS PERMANEN</strong>:
                                </p>
                                <ul className="text-xs text-red-600 mt-2 space-y-1 ml-4 list-disc">
                                    <li>Seluruh produk dan kategori</li>
                                    <li>Seluruh transaksi penjualan</li>
                                    <li>Seluruh data pembelian & distributor</li>
                                    <li>Seluruh garansi & stok opname</li>
                                    <li>Seluruh catatan arus kas</li>
                                </ul>
                            </div>

                            <div className="space-y-2 mb-5">
                                <label className="text-xs font-bold text-gray-700">
                                    Ketik <span className="text-red-600 font-mono bg-red-50 px-1.5 py-0.5 rounded">HAPUS SEMUA DATA</span> untuk melanjutkan:
                                </label>
                                <input
                                    type="text"
                                    value={resetConfirmText}
                                    onChange={(e) => setResetConfirmText(e.target.value)}
                                    placeholder="Ketik di sini..."
                                    autoComplete="off"
                                    className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-mono"
                                />
                            </div>

                            {resetConfirmText === 'HAPUS SEMUA DATA' && !countdownDone && resetCountdown === 0 && !resetting && (
                                <button
                                    onClick={startResetCountdown}
                                    className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-all active:scale-95"
                                >
                                    ⏳ Mulai Hitung Mundur (5 Detik)
                                </button>
                            )}

                            {resetCountdown > 0 && (
                                <div className="text-center py-4">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 border-4 border-red-300 mb-3">
                                        <span className="text-2xl font-bold text-red-600">{resetCountdown}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Menunggu {resetCountdown} detik sebelum tombol hapus aktif...</p>
                                </div>
                            )}

                            {resetConfirmText === 'HAPUS SEMUA DATA' && countdownDone && resetCountdown === 0 && !resetting && (
                                <button
                                    onClick={handleResetAllData}
                                    className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/30 animate-pulse"
                                >
                                    🗑️ YA, HAPUS SEMUA DATA SEKARANG
                                </button>
                            )}

                            {resetting && (
                                <div className="text-center py-4">
                                    <div className="inline-flex items-center gap-2 text-red-600">
                                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-medium">Menghapus semua data...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ============================== */}
            {/* RESTORE CONFIRMATION MODAL */}
            {/* ============================== */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-amber-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Database size={20} className="text-white" />
                                </div>
                                <h3 className="text-base font-bold text-white">Konfirmasi Pemulihan</h3>
                            </div>
                            <button onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }} className="text-white/70 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <h4 className="text-sm font-bold text-red-800 mb-1">PERINGATAN KRITIS!</h4>
                                <p className="text-[11px] text-red-600 leading-relaxed uppercase font-black">
                                    SELURUH DATA SAAT INI AKAN DIHAPUS DAN DIGANTIKAN OLEH DATA DARI FILE BACKUP BERIKUT:
                                </p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">File Terpilih:</p>
                                <p className="text-xs font-mono text-gray-700 bg-white px-2 py-1.5 border border-gray-100 rounded truncate">
                                    {pendingRestoreFile?.name}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmRestoreBackup}
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/30"
                                >
                                    Ya, Pulihkan Sekarang
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
