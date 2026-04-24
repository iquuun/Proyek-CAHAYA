import { useState, useEffect } from 'react';
import { Save, Upload, Store, MapPin, X } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface StoreProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StoreProfileModal({ isOpen, onClose }: StoreProfileModalProps) {
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [invoiceStartNumber, setInvoiceStartNumber] = useState('10000');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [storeBankAccounts, setStoreBankAccounts] = useState('');
    const [storeBankAccountName, setStoreBankAccountName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/settings');
            setStoreName(res.data.store_name || '');
            setStoreAddress(res.data.store_address || '');
            setStorePhone(res.data.store_phone || '');
            setInvoiceStartNumber(res.data.invoice_start_number || '10000');
            setStoreBankAccounts(res.data.store_bank_accounts || '');
            setStoreBankAccountName(res.data.store_bank_account_name || '');
            if (res.data.store_logo) {
                const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
                const publicBase = `http://${host}:8000`;
                setLogoPreview(`${publicBase}/storage/${res.data.store_logo}?t=${Date.now()}`);
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
            formData.append('invoice_start_number', invoiceStartNumber);
            formData.append('store_bank_accounts', storeBankAccounts);
            formData.append('store_bank_account_name', storeBankAccountName);
            if (logoFile) {
                formData.append('store_logo', logoFile);
            }

            await api.post('/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Pengaturan berhasil disimpan!');
            fetchSettings();
        } catch (err) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-[#3B82F6] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Store className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Profil Toko</h3>
                            <p className="text-xs text-blue-100">Atur logo, nama, dan alamat untuk faktur</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-40 bg-gray-100 rounded-xl" />
                            <div className="space-y-2">
                                <div className="h-10 bg-gray-100 rounded-lg" />
                                <div className="h-10 bg-gray-100 rounded-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Logo Toko</label>
                                <div className="relative group">
                                    <div className="w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-3" />
                                        ) : (
                                            <div className="text-center p-3">
                                                <Upload className="mx-auto text-gray-300 mb-2" size={16} />
                                                <p className="text-[10px] text-gray-400">Upload Logo</p>
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

                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Nama Toko</label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Telepon / WA</label>
                                        <input
                                            type="text"
                                            value={storePhone}
                                            onChange={(e) => setStorePhone(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Mulai No. Faktur</label>
                                        <input
                                            type="number"
                                            value={invoiceStartNumber}
                                            onChange={(e) => setInvoiceStartNumber(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Rekening Bank</label>
                                        <input
                                            type="text"
                                            value={storeBankAccounts}
                                            onChange={(e) => setStoreBankAccounts(e.target.value)}
                                            placeholder="Cth: BCA 123456"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Atas Nama (a.n)</label>
                                        <input
                                            type="text"
                                            value={storeBankAccountName}
                                            onChange={(e) => setStoreBankAccountName(e.target.value)}
                                            placeholder="Cth: Syahrul Sidik"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <MapPin size={10} /> Alamat Lengkap
                                    </label>
                                    <textarea
                                        value={storeAddress}
                                        onChange={(e) => setStoreAddress(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none text-sm"
                                    />
                                </div>

                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] disabled:bg-gray-300 transition-all active:scale-95"
                    >
                        <Save size={18} />
                        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
