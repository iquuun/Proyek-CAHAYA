import { useState, useEffect } from 'react';
import { Save, Upload, Store, MapPin, Database, DownloadCloud } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

export default function PengaturanPage() {
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeNotes, setStoreNotes] = useState('');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setStoreName(res.data.store_name || '');
            setStoreAddress(res.data.store_address || '');
            setStorePhone(res.data.store_phone || '');
            setStoreNotes(res.data.store_notes || '');
            if (res.data.store_logo) {
                setLogoPreview(`${api.defaults.baseURL?.replace('/api', '')}/storage/${res.data.store_logo}`);
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
            if (logoFile) {
                formData.append('store_logo', logoFile);
            }

            await api.post('/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Pengaturan berhasil disimpan!');
        } catch (err) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
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

    if (loading) return <div className="p-5 text-center text-gray-500">Memuat Pengaturan...</div>;

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
                    <button
                        onClick={handleBackup}
                        disabled={downloading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait transition-all active:scale-95 text-sm"
                    >
                        <DownloadCloud size={16} />
                        {downloading ? 'Memproses...' : 'Download Database (.sqlite)'}
                    </button>
                </div>
                
                <div className="text-xs leading-relaxed bg-amber-50 text-amber-800 p-3.5 rounded-lg border border-amber-200">
                    <strong className="block mb-1 text-amber-900">?? Tips Penting (Wajib Dibaca):</strong> 
                    Klik tombol di atas untuk mengunduh seluruh data aplikasi. <strong>File backup yang terdownload WAJIB Anda pindahkan / seret ke dalam <span className="underline">Google Drive</span> atau simpan di Flashdisk Anda!</strong> Lakukan proses ini secara rutin <strong>minimal 1 minggu sekali</strong> untuk berjaga-jaga apabila komputer/laptop kasir ini mengalami kerusakan/mati total di kemudian hari.
                </div>
            </div>
        </div>
    );
}

