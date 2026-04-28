import { useState, useEffect } from 'react';
import { Monitor, ShoppingBag, Settings, Plus, Trash2, Camera, HelpCircle, Save, Percent, Receipt } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Product {
    id: number;
    name: string;
    harga_beli: number;
    harga_jual: number;
    category?: { name: string };
}

interface CategoryConfig {
    name: string;
    adminPercent: number;
}

interface FeeRule {
    id: string;      
    name: string;    
    type: 'percent' | 'flat';
    value: number;   
    capRp: number;   
}

interface StoreConfig {
    id: string;
    name: string;
    categories: CategoryConfig[];
    feeRules: FeeRule[];
}

interface RakitanItem {
    id: string;
    kategori: string;
    nama: string;
    qty: number;
    modal: number;
}

const DEFAULT_RAKITAN_LAYOUT: RakitanItem[] = [
    { id: '1', kategori: 'PROC', nama: '', qty: 1, modal: 0 },
    { id: '2', kategori: 'MOBO', nama: '', qty: 1, modal: 0 },
    { id: '3', kategori: 'CPU COOLER', nama: '', qty: 1, modal: 0 },
    { id: '4', kategori: 'RAM', nama: '', qty: 1, modal: 0 },
    { id: '5', kategori: 'VGA', nama: '', qty: 1, modal: 0 },
    { id: '6', kategori: 'SSD', nama: '', qty: 1, modal: 0 },
    { id: '7', kategori: 'HDD', nama: '', qty: 1, modal: 0 },
    { id: '8', kategori: 'PSU', nama: '', qty: 1, modal: 0 },
    { id: '9', kategori: 'CASING', nama: '', qty: 1, modal: 0 },
];

const DEFAULT_STORES: StoreConfig[] = [
    {
        id: "shopee_cahaya_id", name: "Shopee Cahaya Komputer ID", categories: [
            { name: "Casing Komputer", adminPercent: 3.5 },
            { name: "Prosesor", adminPercent: 3.5 },
        ],
        feeRules: [
            { id: "s1_pemesanan", name: "Biaya Pemesanan Flat", type: 'flat', value: 1250, capRp: 0 },
            { id: "s1_promo", name: "Promo Xtra", type: 'percent', value: 4.5, capRp: 60000 },
            { id: "s1_ongkir", name: "Gratis Ongkir Xtra", type: 'percent', value: 1.5, capRp: 40000 },
            { id: "s1_afiliasi", name: "Afiliator / PayLater", type: 'percent', value: 0, capRp: 0 }
        ]
    },
    {
        id: "lazada_id", name: "Lazada Store", categories: [
            { name: "Komputer Desktop", adminPercent: 2.5 },
        ],
        feeRules: [
            { id: "lz_pm", name: "Payment Fee", type: 'percent', value: 1.8, capRp: 0 },
            { id: "lz_mb", name: "Max Bonus", type: 'percent', value: 2, capRp: 10000 },
            { id: "lz_fs", name: "Free Shipping Max", type: 'percent', value: 3, capRp: 15000 }
        ]
    }
];

const SearchableSelect = ({ options, value, onChange, placeholder }: { options: {value: string, label: string}[], value: string, onChange: (v: string) => void, placeholder: string }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const selected = options.find(o => o.value === value);

    return (
        <div className="relative">
            <div 
                onClick={() => setOpen(!open)}
                className="w-full text-[11px] px-2 py-1 border border-gray-200 rounded-md bg-white outline-none focus:ring-1 ring-blue-400 cursor-pointer flex justify-between items-center h-[28px]"
            >
                <span className="truncate text-gray-700 font-medium">{selected ? selected.label : placeholder}</span>
                <span className="text-gray-400 text-[10px]">▼</span>
            </div>
            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-xl max-h-60 flex flex-col" style={{ minWidth: "15rem" }}>
                    <div className="p-1 border-b bg-gray-50 rounded-t">
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full text-[11px] px-2 py-1.5 border border-blue-200 rounded outline-none focus:ring-1 ring-blue-400" 
                            placeholder="Ketik untuk mencari..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                    </div>
                    <div className="overflow-y-auto custom-scrollbar">
                        <div onClick={() => { onChange(''); setOpen(false); }} className="px-2 py-2 text-[11px] hover:bg-gray-100 cursor-pointer text-gray-500 italic border-b">-- Batal --</div>
                        {options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())).map(o => (
                            <div 
                                key={o.value} 
                                onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                                className={`px-2 py-1.5 text-[11px] hover:bg-blue-50 cursor-pointer border-b last:border-b-0 ${value === o.value ? 'bg-blue-100 font-bold text-blue-700' : 'text-gray-700'}`}
                            >
                                {o.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>}
        </div>
    );
};

export default function KalkulatorPage() {
    const [activeTab, setActiveTab] = useState<'rakitan' | 'satuan' | 'pengaturan'>('rakitan');
    const [storeConfigs, setStoreConfigs] = useState<StoreConfig[]>(DEFAULT_STORES);
    const [saving, setSaving] = useState(false);

    // Form States
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    
    // Active / Temp Config for specific session
    const [activeAdminPercent, setActiveAdminPercent] = useState<number>(0);
    const [activeFeeRules, setActiveFeeRules] = useState<FeeRule[]>([]);

    // Satuan State
    const [modalSatuan, setModalSatuan] = useState<number[]>([0]);
    const [packingSatuan, setPackingSatuan] = useState<number>(1000);
    const [marginSatuan, setMarginSatuan] = useState<number>(5000);
    const [marginSatuanType, setMarginSatuanType] = useState<'flat' | 'percent'>('flat');

    // Rakitan State with LocalStorage mapping
    const [rakitanItems, setRakitanItems] = useState<RakitanItem[]>(() => {
        const saved = localStorage.getItem('kalkulator_rakitan_state');
        if (saved) return JSON.parse(saved);
        return JSON.parse(JSON.stringify(DEFAULT_RAKITAN_LAYOUT));
    });
    
    // Satuan local storage
    useEffect(() => {
        const d = localStorage.getItem('kalkulator_satuan_state');
        if (d) setModalSatuan(JSON.parse(d));
    }, []);
    useEffect(() => localStorage.setItem('kalkulator_satuan_state', JSON.stringify(modalSatuan)), [modalSatuan]);

    const [packingRakitan, setPackingRakitan] = useState<number>(() => Number(localStorage.getItem('kalkulator_packing')) || 25000);
    const [marginRakitan, setMarginRakitan] = useState<number>(() => Number(localStorage.getItem('kalkulator_margin')) || 500000);
    const [marginRakitanType, setMarginRakitanType] = useState<'flat' | 'percent'>(() => (localStorage.getItem('kalkulator_margin_type') as 'flat' | 'percent') || 'flat');
    const [screenshotMode, setScreenshotMode] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{title: string, desc: string, onConfirm: () => void} | null>(null);

    // Auto-save rakitan state
    useEffect(() => localStorage.setItem('kalkulator_rakitan_state', JSON.stringify(rakitanItems)), [rakitanItems]);
    useEffect(() => localStorage.setItem('kalkulator_packing', packingRakitan.toString()), [packingRakitan]);
    useEffect(() => localStorage.setItem('kalkulator_margin', marginRakitan.toString()), [marginRakitan]);
    useEffect(() => localStorage.setItem('kalkulator_margin_type', marginRakitanType), [marginRakitanType]);

    const resetRakitan = () => {
        setConfirmAction({
            title: 'Kosongkan Komponen?',
            desc: 'Anda yakin ingin mereset seluruh racikan barang dan meja hitung ke titik nol?',
            onConfirm: () => {
                setRakitanItems(JSON.parse(JSON.stringify(DEFAULT_RAKITAN_LAYOUT)));
                setPackingRakitan(25000);
                setMarginRakitan(500000);
                toast.success("Daftar Rakitan dibersihkan.");
            }
        });
    };
    
    // Products for Autocomplete
    const [products, setProducts] = useState<Product[]>([]);

    // Load Settings and Products on Mount
    useEffect(() => {
        api.get('/settings').then(res => {
            if (res.data.ecommerce_calc_config) {
                try {
                    const parsed = JSON.parse(res.data.ecommerce_calc_config);
                    if (parsed && Array.isArray(parsed)) {
                        const verifiedStores = parsed.map(s => ({
                            ...s,
                            feeRules: s.feeRules || []
                        }));
                        setStoreConfigs(verifiedStores);
                        if (verifiedStores.length > 0) setSelectedStoreId(verifiedStores[0].id);
                    }
                } catch (e) {
                    console.error('Failed to parse calc settings');
                    if (DEFAULT_STORES.length > 0) setSelectedStoreId(DEFAULT_STORES[0].id);
                }
            } else {
                if (DEFAULT_STORES.length > 0) setSelectedStoreId(DEFAULT_STORES[0].id);
            }
        });
        
        api.get('/products').then(res => {
            if (res.data && Array.isArray(res.data)) {
                setProducts(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                setProducts(res.data.data);
            }
        }).catch(err => console.error("Gagal load produk", err));
    }, []);

    const saveSettings = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('ecommerce_calc_config', JSON.stringify(storeConfigs));
            await api.post('/settings', formData);
            toast.success('Pengaturan Toko & Persentase berhasil disimpan permanen!');
        } catch (err) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    // Auto load configs when store changes
    useEffect(() => {
        const store = storeConfigs.find(s => s.id === selectedStoreId);
        if (store) {
            // Load fee rules deep copy so editing locally doesn't mutate store instantly
            setActiveFeeRules(JSON.parse(JSON.stringify(store.feeRules)));
            const cat = store.categories.find(c => c.name === selectedCategory);
            if (cat) setActiveAdminPercent(cat.adminPercent);
        }
    }, [selectedStoreId, storeConfigs]); // eslint-disable-line

    // Auto update admin percent when category changes
    useEffect(() => {
        const store = storeConfigs.find(s => s.id === selectedStoreId);
        if (store) {
            const cat = store.categories.find(c => c.name === selectedCategory);
            if (cat) setActiveAdminPercent(cat.adminPercent);
        }
    }, [selectedCategory]); // eslint-disable-line

    // THE ENGINE
    const hitungEcommerce = (totalModalComponent: number, packingFisik: number, targetMargin: number) => {
        const targetBersih = totalModalComponent + packingFisik + targetMargin;
        if (targetBersih <= 0) return { hargaJualOnline: 0, potonganLainnya: [], admin: 0, totalPotongan: 0, hargaOffline: 0 };

        let sp = targetBersih;
        let lastSp = 0;
        let iters = 0;
        
        // Deep copy untuk iterasi perhitungan
        let calculatedRules = JSON.parse(JSON.stringify(activeFeeRules)) as (FeeRule & { calculatedNominal: number })[];
        let adminNominal = 0;

        while (Math.abs(sp - lastSp) > 1 && iters < 100) {
            lastSp = sp;
            adminNominal = sp * (activeAdminPercent / 100);
            
            let totalLainnya = adminNominal;
            
            calculatedRules = calculatedRules.map(cr => {
                let v = 0;
                if (cr.type === 'percent') {
                    v = sp * (cr.value / 100);
                    if (cr.capRp > 0) v = Math.min(v, cr.capRp);
                } else if (cr.type === 'flat') {
                    v = cr.value;
                }
                totalLainnya += v;
                return { ...cr, calculatedNominal: v };
            });

            sp = targetBersih + totalLainnya;
            iters++;
        }

        const onlinePrice = Math.ceil(sp);

        return {
            hargaOffline: totalModalComponent + targetMargin, // Harga putus tanpa packing
            hargaJualOnline: onlinePrice,
            admin: adminNominal,
            potonganLainnya: calculatedRules,
            totalPotongan: sp - targetBersih
        };
    };

    const renderConfigForm = () => (
        <div className="bg-white border rounded-xl shadow-sm p-3 mb-4">
            <div className="flex flex-wrap lg:flex-nowrap gap-3 mb-2">
                <div className="w-full lg:w-1/3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pilih Toko ({storeConfigs.find(s=>s.id===selectedStoreId)?.name || '...'})</label>
                    <select
                        value={selectedStoreId}
                        onChange={(e) => {
                            setSelectedStoreId(e.target.value);
                            setSelectedCategory('');
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none"
                    >
                        <option value="">-- Pilih Toko --</option>
                        {storeConfigs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="w-full lg:w-1/3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kategori Barang</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none"
                    >
                        <option value="">-- Pilih Kategori --</option>
                        {storeConfigs.find(s => s.id === selectedStoreId)?.categories.map(c => (
                            <option key={c.name} value={c.name}>{c.name} ({c.adminPercent}%)</option>
                        ))}
                    </select>
                </div>
                <div className="w-full lg:w-1/3">
                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Admin Kategori (%)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={activeAdminPercent}
                            onChange={(e) => setActiveAdminPercent(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1.5 border border-blue-200 bg-blue-50 focus:bg-white rounded-lg focus:ring-1 focus:ring-[#3B82F6] font-bold outline-none"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-blue-600">%</span>
                    </div>
                </div>
            </div>

            {/* Dynamic Fee Inputs based on Store activeFeeRules */}
            {activeFeeRules.length > 0 && (
                <div className="flex flex-wrap lg:flex-nowrap gap-2 bg-orange-50/50 border border-orange-100 p-2 rounded-lg">
                    {activeFeeRules.map((rule, idx) => (
                        <div key={rule.id} className="flex-1 bg-white border border-orange-100 rounded px-2 py-1.5 shadow-sm">
                            <label className="block text-[9px] font-bold text-gray-600 uppercase leading-tight mb-1 truncate" title={rule.name}>
                                {rule.name}
                            </label>
                            
                            <div className="flex gap-1">
                                <div className="relative flex-1">
                                    {rule.type === 'flat' && <span className="absolute left-1.5 top-1 text-[9px] text-gray-400 font-bold">Rp</span>}
                                    <input 
                                        type={rule.type === 'percent' ? "number" : "text"} 
                                        min="0"
                                        step={rule.type === 'percent' ? "0.1" : undefined} 
                                        value={rule.type === 'percent' ? (rule.value === 0 ? '' : rule.value) : (rule.value === 0 ? '' : rule.value.toLocaleString('id-ID'))} 
                                        onChange={(e) => {
                                            if (rule.type === 'percent') {
                                                const val = Math.max(0, Number(e.target.value));
                                                const n = [...activeFeeRules];
                                                n[idx].value = val;
                                                setActiveFeeRules(n);
                                            } else {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                const numValue = parseInt(rawValue, 10);
                                                const val = isNaN(numValue) ? 0 : Math.max(0, numValue);
                                                const n = [...activeFeeRules];
                                                n[idx].value = val;
                                                setActiveFeeRules(n);
                                            }
                                        }} 
                                        className={`w-full text-[11px] py-1 border border-gray-200 rounded focus:ring-1 ring-blue-400 outline-none ${rule.type === 'flat' ? 'pl-5 pr-1' : 'pl-1 pr-4'}`} 
                                    />
                                    {rule.type === 'percent' && <span className="absolute right-1.5 top-1 text-[9px] text-gray-400 font-bold">%</span>}
                                </div>
                                
                                {rule.type === 'percent' && (
                                    <div className="relative flex-1 bg-gray-50 rounded border border-gray-100 group/max">
                                        <span className="absolute left-1.5 top-1.5 text-[7px] font-black text-gray-400 uppercase tracking-tighter">MAX</span>
                                        <input 
                                            type="text" 
                                            min="0"
                                            value={rule.capRp === 0 ? '' : rule.capRp.toLocaleString('id-ID')} 
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                const numValue = parseInt(rawValue, 10);
                                                const val = isNaN(numValue) ? 0 : Math.max(0, numValue);
                                                const n = [...activeFeeRules];
                                                n[idx].capRp = val;
                                                setActiveFeeRules(n);
                                            }} 
                                            className="w-full text-[10px] pl-[32px] pr-1 py-1 bg-transparent outline-none focus:bg-white font-bold" 
                                            placeholder="0"
                                            title="Batas maksimal potongan (Rp). 0 = Tanpa batas"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderSatuan = () => {
        const totalModal = modalSatuan.reduce((a, b) => a + Number(b), 0);
        const effectiveMarginSatuan = marginSatuanType === 'percent' ? Math.round(totalModal * (marginSatuan / 100)) : marginSatuan;
        const result = hitungEcommerce(totalModal, packingSatuan, effectiveMarginSatuan);

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2">
                {renderConfigForm()}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    <div>

                    <div className="bg-white border rounded-xl shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                            Barang Fisik
                            <button onClick={() => setModalSatuan([...modalSatuan, 0])} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">+ Baris Barang</button>
                        </h3>
                        
                        <div className="space-y-3 mb-4">
                            {modalSatuan.map((mod, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs font-medium w-32">Harga Modal {idx + 1}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-xs text-gray-500">Rp</span>
                                        <input 
                                            type="text" 
                                            min="0"
                                            value={mod === 0 ? '' : mod.toLocaleString('id-ID')} 
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                const numValue = parseInt(rawValue, 10);
                                                const newMods = [...modalSatuan];
                                                newMods[idx] = isNaN(numValue) ? 0 : Math.max(0, numValue);
                                                setModalSatuan(newMods);
                                            }}
                                            className="w-full text-sm pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3B82F6]" 
                                        />
                                    </div>
                                    {modalSatuan.length > 1 && (
                                        <button onClick={() => setModalSatuan(modalSatuan.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Kemasan/Packing (Rp)</label>
                                <input type="text" min="0" value={packingSatuan === 0 ? '' : packingSatuan.toLocaleString('id-ID')} onChange={(e) => {
                                    const rawValue = e.target.value.replace(/\./g, '');
                                    const numValue = parseInt(rawValue, 10);
                                    setPackingSatuan(isNaN(numValue) ? 0 : Math.max(0, numValue));
                                }} className="w-full text-sm px-3 py-2 border bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#3B82F6]" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-emerald-700 mb-1">Target Margin Bersih</label>
                                <div className="flex gap-1">
                                    <input type={marginSatuanType === 'percent' ? "number" : "text"} min="0" value={marginSatuanType === 'percent' ? (marginSatuan === 0 ? '' : marginSatuan) : (marginSatuan === 0 ? '' : marginSatuan.toLocaleString('id-ID'))} onChange={(e) => {
                                        if (marginSatuanType === 'percent') {
                                            setMarginSatuan(Math.max(0, Number(e.target.value)));
                                        } else {
                                            const rawValue = e.target.value.replace(/\./g, '');
                                            const numValue = parseInt(rawValue, 10);
                                            setMarginSatuan(isNaN(numValue) ? 0 : Math.max(0, numValue));
                                        }
                                    }} className="flex-1 text-sm px-3 py-2 border border-emerald-300 bg-emerald-50 focus:bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold" />
                                    <button
                                        onClick={() => setMarginSatuanType(marginSatuanType === 'flat' ? 'percent' : 'flat')}
                                        className={`px-3 py-2 rounded-lg text-xs font-black border transition-all shrink-0 ${marginSatuanType === 'percent' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'}`}
                                        title="Klik untuk ganti mode: Rp (flat) atau % (persen dari modal)"
                                    >
                                        {marginSatuanType === 'percent' ? '%' : 'Rp'}
                                    </button>
                                </div>
                                {marginSatuanType === 'percent' && <p className="text-[10px] text-emerald-600 mt-1">= Rp {effectiveMarginSatuan.toLocaleString('id-ID')} ({marginSatuan}% dari modal)</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="bg-white border rounded-xl shadow-lg overflow-hidden sticky top-4">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 text-white text-center">
                            <h2 className="text-lg font-bold">HASIL KALKULASI E-COMMERCE</h2>
                            <p className="text-xs text-gray-300">Pendapatan Bersih / Target Kantong: Rp {marginSatuan.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-[11px] font-bold text-emerald-800 uppercase">JUMLAH HARGA PEMBELIAN OFFLINE</p>
                                    <p className="text-[10px] text-emerald-600">(Modal + Target Margin. Tanpa Biaya Packing)</p>
                                </div>
                                <span className="text-xl font-bold text-emerald-700">Rp {result.hargaOffline.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-bold text-gray-800 border-b pb-1 mb-2">Simulasi Potongan Marketplace:</p>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">Admin Kategori ({activeAdminPercent}%)</span><span className="text-gray-800">Rp {result.admin.toLocaleString('id-ID', {maximumFractionDigits:0})}</span></div>
                                {result.potonganLainnya.map(rule => (
                                    <div key={rule.id} className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">{rule.name} {rule.type === 'percent' ? `(${rule.value}%)` : `(Flat)`}</span>
                                        <span className="text-gray-800">Rp {rule.calculatedNominal.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-xs font-bold pt-2 border-t mt-2"><span className="text-red-700">TOTAL POTONGAN ONLINE</span><span className="text-red-700">Rp {result.totalPotongan.toLocaleString('id-ID', {maximumFractionDigits:0})}</span></div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-xl flex items-center justify-between shadow-inner text-white">
                                <div>
                                    <p className="text-xs font-bold text-blue-100 uppercase">JUMLAH HARGA ONLINE SHOP</p>
                                    <p className="text-[10px] text-blue-200 leading-tight mt-1">Gunakan harga ini di E-Commerce agar margin Anda tidak tergerus pajak.</p>
                                </div>
                                <span className="text-2xl font-black drop-shadow-md">Rp {result.hargaJualOnline.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    };

    const renderRakitan = () => {
        const totalModalComponent = rakitanItems.reduce((a, b) => a + (b.qty * b.modal), 0);
        const effectiveMarginRakitan = marginRakitanType === 'percent' ? Math.round(totalModalComponent * (marginRakitan / 100)) : marginRakitan;
        const result = hitungEcommerce(totalModalComponent, packingRakitan, effectiveMarginRakitan);
        
        // Extract unique categories from products
        const dbCategories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))).sort();

        return (
            <div className="transition-all animate-in fade-in slide-in-from-bottom-2">
                {!screenshotMode && renderConfigForm()}
                
                <div className={`${screenshotMode ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                    {/* Mode Developer (Layar Kiri) */}
                    {!screenshotMode && (
                        <div className="space-y-4">
                        
                        <div className="bg-white border rounded-xl shadow-sm p-4">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                                <span>Daftar Komponen Rakitan <span className="text-[10px] font-normal text-gray-400 italic ml-2">(Auto-saved)</span></span>
                                <div className="flex gap-2">
                                    <button onClick={resetRakitan} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 font-bold border border-red-200">Kosongkan</button>
                                    <button onClick={() => setRakitanItems([...rakitanItems, { id: Date.now().toString(), kategori: 'TAMBAHAN', nama: '', qty: 1, modal: 0 }])} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-bold">+ Komponen</button>
                                </div>
                            </h3>
                            
                            <div className="flex gap-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                <div className="w-5 text-center">No</div>
                                <div className="w-[15%] md:w-[15%]">Kategori</div>
                                <div className="w-[45%] md:w-[47%]">Nama Komponen</div>
                                <div className="w-[12%] md:w-[10%] text-center">Qty</div>
                                <div className="flex-1 text-right">Modal / Pcs</div>
                            </div>
                            <div className="space-y-1.5 mb-4">
                                {rakitanItems.map((item, idx) => {
                                    // Filter products for this item's chosen category
                                    const availableProducts = products.filter(p => !item.kategori || item.kategori === 'CUSTOM' || p.category?.name?.toUpperCase() === item.kategori);

                                    return (
                                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-lg relative group" style={{ zIndex: rakitanItems.length - idx }}>
                                            <div className="w-5 text-[10px] font-bold text-gray-400 text-center flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="w-[15%] md:w-[15%]">
                                                <select 
                                                    value={item.kategori} 
                                                    onChange={(e) => { 
                                                        const n = [...rakitanItems]; 
                                                        n[idx].kategori = e.target.value; 
                                                        if (e.target.value !== 'CUSTOM') n[idx].nama = '';
                                                        setRakitanItems(n); 
                                                    }} 
                                                    className="w-full text-[11px] px-1.5 py-1.5 border border-gray-200 rounded-md bg-white outline-none focus:ring-1 ring-blue-400 font-semibold text-gray-700"
                                                >
                                                    <option value="">-- Kat --</option>
                                                    {dbCategories.map(c => <option key={c} value={c?.toUpperCase()}>{c?.toUpperCase()}</option>)}
                                                    {item.kategori && item.kategori !== 'CUSTOM' && !dbCategories.some(c => c?.toUpperCase() === item.kategori) && (
                                                        <option value={item.kategori}>{item.kategori}</option>
                                                    )}
                                                    <option value="CUSTOM">Manual</option>
                                                </select>
                                            </div>

                                            <div className="w-[45%] md:w-[47%]">
                                                {item.kategori === 'CUSTOM' ? (
                                                    <input 
                                                        type="text" 
                                                        value={item.nama} 
                                                        onChange={(e) => { const n = [...rakitanItems]; n[idx].nama = e.target.value; setRakitanItems(n); }} 
                                                        className="w-full text-xs px-2 py-1 border border-gray-200 rounded-md bg-white outline-none focus:ring-1 ring-blue-400" 
                                                        placeholder="Ketik Nama Komponen..." 
                                                    />
                                                ) : (
                                                    <div className="scale-y-90 origin-top">
                                                        <SearchableSelect 
                                                            placeholder="Cari Produk..."
                                                            value={item.nama}
                                                            options={availableProducts.map(p => ({ value: p.name, label: p.name }))}
                                                            onChange={(val) => {
                                                                const n = [...rakitanItems]; 
                                                                n[idx].nama = val; 
                                                                
                                                                const matchedProd = products.find(p => p.name === val);
                                                                if (matchedProd) {
                                                                    n[idx].modal = Number(matchedProd.harga_beli) || 0;
                                                                }
                                                                setRakitanItems(n); 
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-[12%] md:w-[10%]">
                                                <input type="number" min="1" value={item.qty} onChange={(e) => { const n = [...rakitanItems]; n[idx].qty = Math.max(1, Number(e.target.value)); setRakitanItems(n); }} className="w-full text-xs px-1 py-1 border border-gray-200 rounded-md bg-white text-center outline-none focus:ring-1 ring-blue-400 font-bold" />
                                            </div>

                                            <div className="flex-1">
                                                <input type="text" min="0" value={item.modal === 0 ? '' : item.modal.toLocaleString('id-ID')} onChange={(e) => { 
                                                    const rawValue = e.target.value.replace(/\./g, '');
                                                    const numValue = parseInt(rawValue, 10);
                                                    const n = [...rakitanItems]; n[idx].modal = isNaN(numValue) ? 0 : Math.max(0, numValue); setRakitanItems(n); 
                                                }} className="w-full text-xs px-2 py-1 border border-gray-200 rounded-md bg-white outline-none focus:ring-1 ring-blue-400 text-right font-medium" />
                                            </div>

                                            <button onClick={() => setRakitanItems(rakitanItems.filter(r => r.id !== item.id))} className="absolute -right-1 -top-1 md:opacity-0 group-hover:opacity-100 transition p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 z-10"><Trash2 size={12}/></button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Packing Kayu (Rp)</label>
                                    <input type="text" min="0" value={packingRakitan === 0 ? '' : packingRakitan.toLocaleString('id-ID')} onChange={(e) => {
                                        const rawValue = e.target.value.replace(/\./g, '');
                                        const numValue = parseInt(rawValue, 10);
                                        setPackingRakitan(isNaN(numValue) ? 0 : Math.max(0, numValue));
                                    }} className="w-full text-sm px-3 py-2 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#3B82F6]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-emerald-700 mb-1">Target Margin Bersih</label>
                                    <div className="flex gap-1">
                                        <input type={marginRakitanType === 'percent' ? "number" : "text"} min="0" value={marginRakitanType === 'percent' ? (marginRakitan === 0 ? '' : marginRakitan) : (marginRakitan === 0 ? '' : marginRakitan.toLocaleString('id-ID'))} onChange={(e) => {
                                            if (marginRakitanType === 'percent') {
                                                setMarginRakitan(Math.max(0, Number(e.target.value)));
                                            } else {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                const numValue = parseInt(rawValue, 10);
                                                setMarginRakitan(isNaN(numValue) ? 0 : Math.max(0, numValue));
                                            }
                                        }} className="flex-1 text-sm px-3 py-2 border border-emerald-300 bg-emerald-50 focus:bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold" />
                                        <button
                                            onClick={() => setMarginRakitanType(marginRakitanType === 'flat' ? 'percent' : 'flat')}
                                            className={`px-3 py-2 rounded-lg text-xs font-black border transition-all shrink-0 ${marginRakitanType === 'percent' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'}`}
                                            title="Klik untuk ganti mode: Rp (flat) atau % (persen dari modal)"
                                        >
                                            {marginRakitanType === 'percent' ? '%' : 'Rp'}
                                        </button>
                                    </div>
                                    {marginRakitanType === 'percent' && <p className="text-[10px] text-emerald-600 mt-1">= Rp {effectiveMarginRakitan.toLocaleString('id-ID')} ({marginRakitan}% dari total modal)</p>}
                                </div>
                            </div>
                            
                            {/* Rincian Admin/Potongan */}
                            <div className="border border-red-100 bg-red-50/30 rounded-lg p-3 space-y-1 mb-4">
                                <p className="text-[11px] font-bold text-red-800 border-b border-red-100 pb-1 mb-1">Rincian Potongan Market:</p>
                                <div className="flex justify-between text-[11px]"><span className="text-gray-500">Admin Kategori ({activeAdminPercent}%)</span><span className="text-gray-800 font-medium">Rp {result.admin.toLocaleString('id-ID', {maximumFractionDigits:0})}</span></div>
                                {result.potonganLainnya.map(rule => (
                                    <div key={rule.id} className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">{rule.name} {rule.type === 'percent' ? `(${rule.value}%)` : `(Flat)`}</span>
                                        <span className="text-gray-800 font-medium">Rp {rule.calculatedNominal.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-[11px] font-bold pt-1.5 border-t border-red-100 mt-1.5"><span className="text-red-700">TOTAL POTONGAN ONLINE</span><span className="text-red-700">Rp {result.totalPotongan.toLocaleString('id-ID', {maximumFractionDigits:0})}</span></div>
                            </div>
                            
                            <button onClick={() => setScreenshotMode(true)} className="w-full mt-5 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-black text-white py-3 rounded-lg text-sm font-bold shadow-xl hover:from-black hover:to-gray-800 transition active:scale-[0.98]">
                                <Camera size={18} /> KUNCI & BUKA MODE SCREENSHOT CUSTOMER
                            </button>
                        </div>
                    </div>
                )}

                {/* Mode Screenshot Customer (Layar Kanan / Penuh) */}
                <div className={`transition-all duration-300 ${screenshotMode ? 'max-w-2xl mx-auto' : ''}`}>
                    <div className={`bg-white overflow-hidden ${screenshotMode ? 'rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-200' : 'border rounded-xl shadow-lg'}`}>
                        {screenshotMode && (
                            <div className="bg-gray-100 print:hidden p-3 border-b flex justify-between items-center shadow-inner">
                                <div className="text-xs font-bold text-gray-500 flex items-center gap-2"><Camera size={14}/> LAYAR SCREENSHOT AKTIF</div>
                                <button onClick={() => setScreenshotMode(false)} className="bg-red-500 text-white px-4 py-1.5 rounded-lg shadow-md hover:bg-red-600 font-bold text-xs uppercase tracking-wide">Tutup Screenshot</button>
                            </div>
                        )}
                        
                        <div className="bg-white p-6 pb-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-widest border-b-[3px] border-black pb-2 inline-block">KALKULATOR RAKITAN BARANG</h2>
                                <p className="text-xs font-medium text-gray-500 mt-1">Spesifikasi Detail PC Anda</p>
                            </div>
                            
                            {/* Simple 3 Column Table for Customer */}
                            <table className="w-full text-left border-collapse font-sans">
                                <thead>
                                    <tr className="border-y-[3px] border-black bg-gray-50">
                                        <th className="py-3 px-2 text-xs font-black uppercase text-gray-800 w-8 text-center">No</th>
                                        <th className="py-3 px-2 text-xs font-black uppercase text-gray-800 w-1/4">Kategori</th>
                                        <th className="py-3 px-2 text-xs font-black uppercase text-gray-800">Nama Barang</th>
                                        <th className="py-3 px-2 text-xs font-black uppercase text-gray-800 text-center w-16">QTY</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dashed divide-gray-200">
                                    {rakitanItems.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-2.5 px-2 text-xs font-bold text-gray-400 text-center">{idx + 1}</td>
                                            <td className="py-2.5 px-2 text-xs font-bold text-gray-600 uppercase">{item.kategori}</td>
                                            <td className="py-2.5 px-2 text-sm font-medium text-gray-900">{item.nama}</td>
                                            <td className="py-2.5 px-2 text-sm font-bold text-gray-900 text-center">{item.qty}x</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Harga Final Banner */}
                            <div className="mt-8 space-y-3">
                                {/* Dotted divider */}
                                <div className="border-t-[3px] border-dashed border-gray-200 mb-4"></div>

                                <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 shadow-sm overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">Total Offline</span>
                                        <span className="text-xs font-medium text-emerald-800/80">Pembelian Langsung di Toko</span>
                                    </div>
                                    <div className="text-right z-10">
                                        <span className="text-2xl font-black text-emerald-600 tracking-tight">Rp {result.hargaOffline.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-orange-50 border-2 border-orange-500 rounded-xl p-4 shadow-sm overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-1">Total Online Shop</span>
                                        <span className="text-xs font-medium text-orange-800/80">Via E-Commerce ({storeConfigs.find(s=>s.id===selectedStoreId)?.name || 'Shopee/Toped'})</span>
                                    </div>
                                    <div className="text-right z-10">
                                        <span className="text-2xl font-black text-orange-600 tracking-tight">Rp {result.hargaJualOnline.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    };

    const renderSettingToko = () => {
        return (
            <div className="bg-white border rounded-xl shadow-sm p-4 mx-auto animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Master Data Toko & Biaya</h2>
                        <p className="text-[11px] text-gray-500">Aturan Promo/Ongkir dinamis per E-commerce.</p>
                    </div>
                    <button onClick={saveSettings} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition shadow-md active:scale-95">
                        <Save size={14}/> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {storeConfigs.map((store, sIndex) => (
                        <div key={store.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/30 overflow-hidden relative">
                            <div className="flex justify-between items-center mb-3 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><StoreIcon /></div>
                                    <input 
                                        type="text" 
                                        value={store.name} 
                                        onChange={(e) => {
                                            const newly = [...storeConfigs];
                                            newly[sIndex].name = e.target.value;
                                            setStoreConfigs(newly);
                                        }} 
                                        className="font-bold text-sm bg-transparent border-b border-dashed border-gray-300 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full transition-colors"
                                        placeholder="Nama Toko"
                                    />
                                </div>
                                <button onClick={() => {
                                    setConfirmAction({
                                        title: 'Hapus Etalase Toko?',
                                        desc: `Secara permanen akan menghapus toko "${store.name || 'yang dipilih'}" beserta semua pengaturan pajaknya.`,
                                        onConfirm: () => {
                                            setStoreConfigs(storeConfigs.filter((_, i) => i !== sIndex));
                                            toast.success('Toko berhasil dihapus');
                                        }
                                    });
                                }} className="text-red-500 hover:bg-red-100 p-1 rounded text-[10px] font-bold flex items-center gap-0.5 border border-red-200 bg-white shrink-0">
                                    <Trash2 size={11}/> Hapus
                                </button>
                            </div>

                            <div className="space-y-3 relative z-10">
                                {/* Kategori % Setting */}
                                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                    <h4 className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><Percent size={12} className="text-blue-500"/> Persentase Kategori</h4>
                                    <div className="space-y-1.5">
                                        {store.categories.map((cat, cIndex) => (
                                            <div key={cIndex} className="flex items-center gap-1.5 group">
                                                <input 
                                                    type="text" 
                                                    value={cat.name} 
                                                    onChange={(e) => {
                                                        const newly = [...storeConfigs];
                                                        newly[sIndex].categories[cIndex].name = e.target.value;
                                                        setStoreConfigs(newly);
                                                    }}
                                                    className="flex-1 text-[11px] border border-gray-200 px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-400" 
                                                    placeholder="Kategori"
                                                />
                                                <div className="relative w-16">
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.1"
                                                        value={cat.adminPercent} 
                                                        onChange={(e) => {
                                                            const val = Math.max(0, Number(e.target.value));
                                                            const newly = [...storeConfigs];
                                                            newly[sIndex].categories[cIndex].adminPercent = val;
                                                            setStoreConfigs(newly);
                                                        }}
                                                        className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 pr-5 outline-none focus:ring-1 focus:ring-blue-400 font-bold" 
                                                    />
                                                    <span className="absolute right-1.5 top-1 text-[9px] text-gray-400">%</span>
                                                </div>
                                                <button onClick={() => {
                                                    const newly = [...storeConfigs];
                                                    newly[sIndex].categories = newly[sIndex].categories.filter((_, i) => i !== cIndex);
                                                    setStoreConfigs(newly);
                                                }} className="text-gray-300 hover:text-red-500 p-0.5"><Trash2 size={13}/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => {
                                        const newly = [...storeConfigs];
                                        newly[sIndex].categories.push({ name: 'Baru', adminPercent: 0 });
                                        setStoreConfigs(newly);
                                    }} className="mt-2 w-full border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 py-1 rounded text-[10px] font-bold transition">
                                        + Kategori
                                    </button>
                                </div>

                                {/* Dynamic Fee Rules */}
                                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                    <h4 className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><Receipt size={12} className="text-orange-500"/> Aturan Ekstra</h4>
                                    <div className="space-y-2">
                                        {store.feeRules.map((r, rIndex) => (
                                            <div key={rIndex} className="bg-orange-50/50 p-2 rounded border border-orange-100/50 relative group">
                                                <div className="flex gap-1.5 mb-1.5">
                                                    <input type="text" value={r.name} onChange={(e) => {
                                                        const newly = [...storeConfigs]; newly[sIndex].feeRules[rIndex].name = e.target.value; setStoreConfigs(newly);
                                                    }} className="flex-1 text-[11px] font-bold bg-transparent border-b border-gray-300 focus:border-orange-500 outline-none pb-0" placeholder="Nama Biaya" />
                                                    
                                                    <select value={r.type} onChange={(e) => {
                                                        const newly = [...storeConfigs]; newly[sIndex].feeRules[rIndex].type = e.target.value as 'percent'|'flat'; setStoreConfigs(newly);
                                                    }} className="text-[9px] bg-white border rounded px-1 text-gray-600 outline-none">
                                                        <option value="percent">%</option>
                                                        <option value="flat">Rp</option>
                                                    </select>
                                                </div>

                                                <div className="flex gap-1.5">
                                                    <div className="relative flex-1">
                                                        {r.type === 'flat' && <span className="absolute left-1.5 top-1 text-[9px] text-gray-400">Rp</span>}
                                                        <input type="number" min="0" step={r.type==='percent'?'0.1':'100'} value={r.value} onChange={(e) => {
                                                            const val = Math.max(0, Number(e.target.value));
                                                            const newly = [...storeConfigs]; newly[sIndex].feeRules[rIndex].value = val; setStoreConfigs(newly);
                                                        }} className={`w-full text-[11px] py-1 border rounded outline-none focus:ring-1 ring-orange-400 ${r.type === 'flat' ? 'pl-5 pr-1' : 'px-2'}`}/>
                                                        {r.type === 'percent' && <span className="absolute right-1.5 top-1 text-[9px] text-gray-400">%</span>}
                                                    </div>
                                                    
                                                    {r.type === 'percent' && (
                                                        <div className="flex-1 flex items-center gap-1">
                                                            <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">Max:</span>
                                                            <input type="number" min="0" value={r.capRp} onChange={(e) => {
                                                                const val = Math.max(0, Number(e.target.value));
                                                                const newly = [...storeConfigs]; newly[sIndex].feeRules[rIndex].capRp = val; setStoreConfigs(newly);
                                                            }} className="w-full text-[11px] px-1.5 py-1 border rounded outline-none focus:ring-1 ring-orange-400" placeholder="0"/>
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => {
                                                    const newly = [...storeConfigs]; newly[sIndex].feeRules = newly[sIndex].feeRules.filter((_, i) => i !== rIndex); setStoreConfigs(newly);
                                                }} className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600"><Trash2 size={10}/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => {
                                        const newly = [...storeConfigs];
                                        newly[sIndex].feeRules.push({ id: `fr_${Date.now()}`, name: 'Aturan Baru', type: 'percent', value: 0, capRp: 0 });
                                        setStoreConfigs(newly);
                                    }} className="mt-2 w-full border border-dashed border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 py-1 rounded text-[10px] font-bold transition">
                                        + Aturan Extra
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <button onClick={() => setStoreConfigs([...storeConfigs, { id: `store_${Date.now()}`, name: 'Toko Baru', categories: [], feeRules: [] }])} className="w-full flex items-center justify-center gap-2 py-3 shadow-sm border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 font-bold text-sm tracking-wide transition active:scale-[0.99]">
                        <Plus size={16} /> TAMBAH TOKO BARU
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-xl font-black text-gray-800 flex items-center gap-3">
                        <Monitor className="text-[#3B82F6]" size={24} />
                        Kalkulator Margin Aman
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Simulasi akurat harga jual online & mode screenshot rakitan.</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1 w-fit">
                    <button onClick={() => setActiveTab('rakitan')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'rakitan' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Monitor size={16} /> Rakitan PC
                    </button>
                    <button onClick={() => setActiveTab('satuan')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'satuan' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <ShoppingBag size={16} /> E-commerce
                    </button>
                    <button onClick={() => setActiveTab('pengaturan')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'pengaturan' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Settings size={16} /> Profil Toko
                    </button>
                </div>
            </div>

            {activeTab === 'satuan' && renderSatuan()}
            {activeTab === 'rakitan' && renderRakitan()}
            {activeTab === 'pengaturan' && renderSettingToko()}

            {confirmAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
                           <Trash2 className="text-red-600" size={28} />
                        </div>
                        <h3 className="text-xl font-black text-center text-gray-900 mb-2">{confirmAction.title}</h3>
                        <p className="text-sm text-center text-gray-500 mb-8 leading-relaxed px-2">{confirmAction.desc}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition active:scale-95">Batal</button>
                            <button onClick={() => {
                                confirmAction.onConfirm();
                                setConfirmAction(null);
                            }} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition active:scale-95">Ya, Eksekusi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StoreIcon = () => (
    <svg xmlns="http://www.w3.org/polymorphism" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);
