import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Trash2, Printer, History, ShoppingCart, Ban, ChevronLeft, ChevronRight, Calendar, Download, GripVertical, Edit2, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  kode?: string;
  name: string;
  harga_jual: number;
  stok_saat_ini: number;
  category_id: number;
  category?: Category;
}

interface SaleItem {
  id?: number;
  product: Product;
  qty: number;
  harga_jual_saat_itu: number;
  is_sub?: boolean;
  parent_id?: number;
  satuan?: string;
  manual_name?: string;
}

interface Sale {
  id: number;
  invoice: string;
  channel: string;
  tanggal: string;
  total_penjualan: number;
  pembayaran: number;
  kembalian: number;
  status_bayar?: string;
  sisa_bayar?: number;
  items: SaleItem[];
  user?: { name: string };
  tax_percent: number;
  tax_amount: number;
  username_pembeli?: string;
  alamat_pembeli?: string;
  telepon_pembeli?: string;
}

export default function PenjualanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const initDraft = () => {
    try {
      const saved = localStorage.getItem('draftKasir');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  };
  const draft = initDraft() || {};

  const [saleItems, setSaleItems] = useState<SaleItem[]>(draft.saleItems || []);
  const [loading, setLoading] = useState(true);
  const [visibleProducts, setVisibleProducts] = useState(30);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Sale Options
  const [channel, setChannel] = useState(draft.channel || 'Offline');
  const [payment, setPayment] = useState(draft.payment || '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [customerAddress, setCustomerAddress] = useState(draft.customerAddress || '');
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone || '');
  const [customerName, setCustomerName] = useState(draft.customerName || '');
  const [taxPercent, setTaxPercent] = useState(draft.taxPercent || 0);
  const [isManual, setIsManual] = useState(false);
  const [manualInvoice, setManualInvoice] = useState('');
  const [manualDate, setManualDate] = useState('');

  // Template Management
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (activeTab === 'pos') {
      localStorage.setItem('draftKasir', JSON.stringify({
        saleItems, channel, payment, customerAddress, customerPhone, customerName, taxPercent
      }));
    }
  }, [saleItems, channel, payment, customerAddress, customerPhone, customerName, taxPercent, activeTab]);

  useEffect(() => {
    if (lastSale && shouldPrint) {
      const handlePrint = () => {
        const logoImg = document.querySelector('.faktur-print img') as HTMLImageElement;
        
        let isExecuted = false;
        const executePrint = () => {
          if (isExecuted) return;
          isExecuted = true;
          setTimeout(() => {
            window.print();
            setShouldPrint(false);
            toast.success('Transaksi Berhasil!');
          }, 500);
        };

        if (logoImg && !logoImg.complete) {
          logoImg.onload = executePrint;
          logoImg.onerror = executePrint; // fallback
          // Safety timeout in case load takes too long
          setTimeout(executePrint, 3000);
        } else {
          executePrint();
        }
      };
      
      handlePrint();
    }
  }, [lastSale, shouldPrint]);
  // History filters & pagination
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 10;

  // Void modal state
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const confirmVoid = async () => {
    if (!voidTarget) return;
    try {
      setIsVoiding(true);
      await api.delete(`/sales/${voidTarget.id}`);
      toast.success(`Transaksi ${voidTarget.invoice} berhasil di-void. Stok telah dikembalikan.`);
      setVoidTarget(null);
      const [salesRes, prodRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
      ]);
      setSales(salesRes.data);
      setProducts(prodRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan transaksi');
    } finally {
      setIsVoiding(false);
    }
  };

  // Pelunasan DP modal state
  const [pelunasanTarget, setPelunasanTarget] = useState<Sale | null>(null);
  const [pelunasanInput, setPelunasanInput] = useState('');
  const [isPelunasanSubmitting, setIsPelunasanSubmitting] = useState(false);

  const handlePelunasanSubmit = async () => {
    if (!pelunasanTarget || !pelunasanInput || Number(pelunasanInput) < 1) return;
    try {
      setIsPelunasanSubmitting(true);
      const res = await api.post(`/sales/${pelunasanTarget.id}/pelunasan`, {
        jumlah_bayar: Number(pelunasanInput)
      });
      toast.success('Pelunasan berhasil diproses!');
      setPelunasanTarget(null);
      setPelunasanInput('');
      const salesRes = await api.get('/sales');
      setSales(salesRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses pelunasan');
    } finally {
      setIsPelunasanSubmitting(false);
    }
  };

  const channels = ['Offline', 'Cahaya Komputer ID', 'Cahaya Tech', 'Lazada', 'Tiktokshop'];

  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const posTemplates = useMemo(() => {
    try {
      return settings.pos_templates ? JSON.parse(settings.pos_templates) : [];
    } catch (e) {
      return [];
    }
  }, [settings.pos_templates]);

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Masukkan nama template!');
      return;
    }
    if (saleItems.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }
    try {
      setIsSubmitting(true);
      const newTemplate = {
        id: Date.now(),
        name: templateName,
        items: saleItems.map(it => ({
          product_id: it.product.id,
          qty: it.qty,
          harga_jual_saat_itu: it.harga_jual_saat_itu,
          satuan: it.satuan,
          is_sub: it.is_sub,
          manual_name: it.product.id < 0 ? it.product.name : undefined
        }))
      };

      const updatedTemplates = [...posTemplates, newTemplate];
      await api.post('/settings', { pos_templates: JSON.stringify(updatedTemplates) });
      await fetchSettings();
      setIsSaveTemplateModalOpen(false);
      setTemplateName('');
      toast.success('Template berhasil disimpan.');
    } catch (e) {
      toast.error('Gagal menyimpan template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (templateItems: any[]) => {
    const itemsToAdd = templateItems.map(it => {
      let productObj: Product | undefined;
      if (it.product_id >= 0) {
        productObj = products.find(p => p.id === it.product_id);
      }

      const product = productObj || {
        id: it.product_id < 0 ? it.product_id : (-Date.now() - Math.random()),
        name: it.manual_name || 'Produk tidak ditemukan',
        harga_jual: it.harga_jual_saat_itu,
        stok_saat_ini: 999,
        category_id: 0
      };

      return {
        product,
        qty: it.qty,
        harga_jual_saat_itu: it.harga_jual_saat_itu,
        satuan: it.satuan || 'PCS',
        is_sub: !!it.is_sub
      };
    });

    setSaleItems([...saleItems, ...itemsToAdd]);
    setIsTemplateModalOpen(false);
    toast.success('Template berhasil ditambahkan ke keranjang.');
  };

  const deleteTemplate = async (id: number) => {
    if (!window.confirm('Hapus template ini?')) return;
    try {
      const updatedTemplates = posTemplates.filter((t: any) => t.id !== id);
      await api.post('/settings', { pos_templates: JSON.stringify(updatedTemplates) });
      await fetchSettings();
      toast.success('Template berhasil dihapus.');
    } catch (e) {
      toast.error('Gagal menghapus template');
    }
  };

  const fetchData = async () => {
    // ... existing fetch logic
    try {
      setLoading(true);
      const [prodRes, catRes, saleRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/sales')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setSales(saleRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const exportSalesCSV = () => {
    const worksheetData: any[][] = [
      ["LAPORAN SELURUH DATA PENJUALAN"],
      [],
      ["Invoice", "Tanggal", "Kasir", "Pemesanan", "Pelanggan", "Total Penjualan", "Pembayaran", "Kembalian"]
    ];

    const filtered = sales.filter((s) => {
      const matchSearch = !historySearch || s.invoice.toLowerCase().includes(historySearch.toLowerCase());
      const matchMonth = !historyMonth || s.tanggal.startsWith(historyMonth);
      return matchSearch && matchMonth;
    });

    filtered.forEach(sale => {
      worksheetData.push([
        sale.invoice,
        sale.tanggal,
        sale.user?.name || 'ADMIN',
        sale.channel,
        (sale as any).customer_name || 'UMUM',
        sale.total_penjualan,
        sale.pembayaran,
        sale.kembalian
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 20 }, // Invoice
      { wch: 15 }, // Tanggal
      { wch: 15 }, // Kasir
      { wch: 15 }, // Pemesanan
      { wch: 25 }, // Pelanggan
      { wch: 15 }, // Total Penjualan
      { wch: 15 }, // Pembayaran
      { wch: 15 }  // Kembalian
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Penjualan");
    
    XLSX.writeFile(workbook, `Riwayat_Penjualan_${historyMonth || 'Semua'}.xlsx`);
  };

  const filteredProducts = products.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) || (p.kode && p.kode.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'all' || p.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory && p.stok_saat_ini > 0;
  });

  const addItem = (product: Product) => {
    // For PC Builders, they might want the same product as normal and as sub
    // So let's allow adding same product multiple times if we want? 
    // No, keep current logic but add is_sub: false
    const existing = saleItems.find((item) => item.product.id === product.id && !item.is_sub);
    if (existing) {
      updateQtyByProduct(product.id, existing.qty + 1);
    } else {
      setSaleItems([...saleItems, { product, qty: 1, harga_jual_saat_itu: product.harga_jual, is_sub: false, satuan: 'PCS' }]);
    }
  };

  const addManualItem = () => {
    const manualProduct: Product = {
      id: -Date.now(),
      kode: '',
      name: 'NAMA PAKET / JASA',
      harga_jual: 0,
      stok_saat_ini: 999,
      category_id: 0
    };
    setSaleItems([...saleItems, { product: manualProduct, qty: 1, harga_jual_saat_itu: 0, is_sub: false, satuan: 'SET' }]);
  };

  const removeItem = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const item = saleItems[idx];
    if (item.product.stok_saat_ini < qty) {
      toast.error('Stok tidak cukup');
      return;
    }
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, qty } : item
      )
    );
  };

  const updateQtyByProduct = (productId: number, qty: number) => {
    setSaleItems(
      saleItems.map((item) =>
        item.product.id === productId && !item.is_sub ? { ...item, qty } : item
      )
    );
  };

  const updateItemPrice = (idx: number, newPrice: number) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, harga_jual_saat_itu: newPrice } : item
      )
    );
  };

  const updateItemName = (idx: number, newName: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, product: { ...item.product, name: newName } } : item
      )
    );
  };

  const updateItemSatuan = (idx: number, newSatuan: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, satuan: newSatuan } : item
      )
    );
  };

  const paketkanSemua = () => {
    if (saleItems.length < 2) {
      toast.error('Minimal harus ada 2 barang untuk dipaketkan');
      return;
    }
    
    // Calculate total price of everything
    const total = saleItems.reduce((sum, item) => sum + (item.harga_jual_saat_itu * item.qty), 0);
    
    const newItems = saleItems.map((item, idx) => {
      if (idx === 0) {
        return { 
          ...item, 
          is_sub: false, 
          harga_jual_saat_itu: total,
          qty: 1 // If it's a package, header is usually 1 set
        };
      }
      return { 
        ...item, 
        is_sub: true, 
        harga_jual_saat_itu: 0 
      };
    });
    
    setSaleItems(newItems);
    toast.success('Seluruh barang berhasil dipaketkan ke baris pertama');
  };

  const toggleSubItem = (idx: number) => {
    setSaleItems(saleItems.map((item, i) => {
      if (i === idx) {
        const isNowSub = !item.is_sub;
        return {
          ...item,
          is_sub: isNowSub,
          harga_jual_saat_itu: isNowSub ? 0 : item.product.harga_jual
        };
      }
      return item;
    }));
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    if (saleItems[idx].is_sub) {
      e.preventDefault(); 
      return;
    }
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setDropTargetIdx(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null) {
      handleDragEnd();
      return;
    }

    let actualTargetIdx = targetIdx;
    while (actualTargetIdx > 0 && saleItems[actualTargetIdx].is_sub) {
      actualTargetIdx--;
    }

    if (draggedIdx === actualTargetIdx) {
      handleDragEnd();
      return;
    }

    let dragEndIdx = draggedIdx;
    while (dragEndIdx + 1 < saleItems.length && saleItems[dragEndIdx + 1].is_sub) {
      dragEndIdx++;
    }
    const blockLength = dragEndIdx - draggedIdx + 1;
    const blockToMove = saleItems.slice(draggedIdx, draggedIdx + blockLength);

    const isDraggingDown = draggedIdx < actualTargetIdx;
    let insertAtIdx = actualTargetIdx;
    
    if (isDraggingDown) {
      while (insertAtIdx + 1 < saleItems.length && saleItems[insertAtIdx + 1].is_sub) {
        insertAtIdx++;
      }
      insertAtIdx++; 
    }

    const newItems = [...saleItems];
    newItems.splice(draggedIdx, blockLength);

    if (draggedIdx < insertAtIdx) {
      insertAtIdx -= blockLength;
    }

    newItems.splice(insertAtIdx, 0, ...blockToMove);
    setSaleItems(newItems);
    handleDragEnd();
  };

  const isTargetBlock = (idx: number) => {
    if (dropTargetIdx === null || draggedIdx === null) return false;
    let tParent = dropTargetIdx;
    while(tParent > 0 && saleItems[tParent].is_sub) tParent--;
    
    // Prevent highlighting if dragging over self
    if (tParent === draggedIdx) return false;

    let tEnd = tParent;
    while(tEnd + 1 < saleItems.length && saleItems[tEnd + 1].is_sub) tEnd++;

    return idx >= tParent && idx <= tEnd;
  };
  // ------------------------------

  const calculatedTotal = saleItems.reduce(
    (sum, item) => sum + item.harga_jual_saat_itu * item.qty,
    0
  );

  const [customTotal, setCustomTotal] = useState(0);

  useEffect(() => {
    setCustomTotal(calculatedTotal);
  }, [saleItems]);

  const handleNumpadInput = (val: string) => {
    if (val === 'C') {
      setPayment('0');
    } else if (val === 'PAS') {
      setPayment(customTotal.toString());
    } else if (payment === '0') {
      setPayment(val);
    } else {
      setPayment((prev: string) => prev + val);
    }
  };

  const handleSubmit = async () => {
    if (payment === '' || parseFloat(payment) < 0) {
      toast.error('Masukkan jumlah pembayaran yang valid!');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        channel,
        total_penjualan: customTotal,
        tax_percent: taxPercent,
        pembayaran: parseFloat(payment),
        kembalian: parseFloat(payment) - customTotal,
        invoice: isManual ? manualInvoice : null,
        tanggal: isManual ? manualDate : null,
        username_pembeli: customerName || 'UMUM',
        alamat_pembeli: customerAddress || '-',
        telepon_pembeli: customerPhone || '-',
        items: saleItems.map((item, idx) => {
          let parent_idx = null;
          if (item.is_sub) {
            // Find the nearest previous item that is NOT a sub
            for (let i = idx - 1; i >= 0; i--) {
              if (!saleItems[i].is_sub) {
                parent_idx = i;
                break;
              }
            }
          }
          return {
            product_id: item.product.id < 0 ? null : item.product.id, // Manual items don't have real product_id
            manual_name: item.product.id < 0 ? item.product.name : null,
            qty: item.qty,
            harga_jual: item.harga_jual_saat_itu,
            satuan: item.satuan,
            is_sub: item.is_sub,
            parent_idx: parent_idx
          };
        })
      };

      const res = await api.post('/sales', payload);
      setLastSale(res.data);
      setShouldPrint(true);
      setSaleItems([]);
      setPayment('0');
      setTaxPercent(0);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setIsManual(false);
      setManualInvoice('');
      setManualDate('');
      localStorage.removeItem('draftKasir');
      fetchData(); // Refresh products and history

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="space-y-6 animate-pulse no-print">
          <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit">
            <div className="h-8 bg-gray-200 rounded-md w-20" /><div className="h-8 bg-gray-200 rounded-md w-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-36 mb-3" /><div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_, i) => (<div key={i}><div className="h-3 bg-gray-200 rounded w-20 mb-1" /><div className="h-8 bg-gray-100 rounded-md" /></div>))}</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-28 mb-3" /><div className="h-[200px] bg-gray-50 rounded-lg flex items-center justify-center"><div className="h-12 w-12 bg-gray-200 rounded-lg" /></div></div>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-24 mb-2" /><div className="h-8 bg-gray-200 rounded-lg mb-2" /><div className="space-y-2">{[...Array(4)].map((_, i) => (<div key={i} className="h-16 bg-gray-50 rounded-lg border border-gray-100" />))}</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="grid grid-cols-3 gap-1.5">{[...Array(12)].map((_, i) => (<div key={i} className="h-9 bg-gray-100 rounded-md" />))}</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Switcher */}
          <div className="sticky top-0 z-40 flex gap-2 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit no-print">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'pos' ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ShoppingCart size={18} />
              Kasir
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <History size={18} />
              Riwayat Penjualan
            </button>
          </div>

          {activeTab === 'pos' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 no-print items-start">

              {/* Left: Customer Info & Review E-Faktur */}
              <div className="lg:col-span-2 flex flex-col gap-2.5 h-auto lg:h-[calc(100vh-110px)]">
                {/* Customer Info Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Informasi Pelanggan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Pelanggan</label>
                      <input
                        type="text"
                        placeholder="Nama Pelanggan / UMUM..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Input Alamat</label>
                      <input
                        type="text"
                        placeholder="Alamat..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Input No. HP/WA</label>
                      <input
                        type="text"
                        placeholder="No. HP/WA..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Manual Input Toggle & Fields */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                       <button 
                        type="button"
                        onClick={() => setIsManual(!isManual)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isManual ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                       >
                        <Edit2 size={12} />
                        {isManual ? 'MODE MANUAL AKTIF' : 'AKTIFKAN INPUT MANUAL (Data Lama)'}
                       </button>
                       {isManual && <p className="text-[10px] text-orange-600 font-bold animate-pulse">⚠️ Perhatikan No. Invoice agar tidak duplikat</p>}
                    </div>

                    {isManual && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-orange-600 uppercase">No. Invoice Manual</label>
                          <input
                            type="text"
                            placeholder="Contoh: INV-LAMA-001"
                            value={manualInvoice}
                            onChange={(e) => setManualInvoice(e.target.value)}
                            className="text-xs bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5 outline-none focus:border-orange-500 transition-colors font-bold"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-orange-600 uppercase">Tanggal Transaksi</label>
                          <input
                            type="datetime-local"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="text-xs bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5 outline-none focus:border-orange-500 transition-colors font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* E-FAKTUR REVIEW (Keranjang) */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-[#3B82F6] p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 shrink-0">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">REVIEW E-FAKTUR</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                       <button 
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <ShoppingCart size={12} />
                        GUNAKAN TEMPLATE
                       </button>
                       <button 
                        onClick={() => setIsSaveTemplateModalOpen(true)}
                        className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <Save size={12} />
                        SIMPAN TEMPLATE
                       </button>
                       <button 
                        onClick={paketkanSemua} 
                        title="Gabungkan semua barang ke paket di baris pertama"
                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <ShoppingCart size={12} />
                        PAKETKAN SEMUA
                       </button>
                      <button onClick={addManualItem} className="text-[10px] bg-gray-100 border border-gray-200 hover:bg-gray-200 py-1.5 px-2.5 rounded-md font-bold text-gray-700">+ BARIS MANUAL</button>
                      <select value={channel} onChange={(e) => setChannel(e.target.value)} className="text-[10px] bg-gray-100 border-none rounded-md px-2 py-1.5 outline-none font-bold text-gray-700">
                        {channels.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cart Table */}
                  <div className="flex-1 overflow-y-auto pr-1 mb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent min-h-[300px]">
                    {saleItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-50">
                        <ShoppingCart size={48} strokeWidth={1} />
                        <p className="text-sm font-medium italic">Keranjang Masih Kosong</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                          <tr>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center w-8">No.</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase">Produk</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center">Qty</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Harga</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Subtotal</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {saleItems.map((item, idx) => {
                            const subtotal = item.harga_jual_saat_itu * item.qty;
                            const displayNum = item.is_sub ? '' : (saleItems.slice(0, idx).filter(it => !it.is_sub).length + 1) + '.';
                            return (
                              <tr 
                                key={idx} 
                                draggable={!item.is_sub}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`group hover:bg-gray-50/80 transition-all 
                                  ${item.is_sub ? 'bg-gray-50/30' : ''} 
                                  ${draggedIdx === idx ? 'opacity-40 bg-gray-100' : ''} 
                                  ${isTargetBlock(idx) ? 'bg-blue-100/70 border-y-2 border-blue-400' : ''}
                                `}
                              >
                                <td className="py-2 px-1.5 text-center text-xs font-bold text-gray-400">
                                  {displayNum}
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {!item.is_sub ? (
                                      <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded text-gray-400 shrink-0" title="Tarik untuk memindahkan">
                                        <GripVertical size={13} strokeWidth={2.5} />
                                      </div>
                                    ) : (
                                      <div className="w-[21px] shrink-0" />
                                    )}
                                    {item.is_sub && <div className="w-2 h-3.5 border-l-2 border-b-2 border-gray-300 rounded-bl ml-0.5" />}
                                    {item.product.id < 0 ? (
                                      <input
                                        type="text"
                                        value={item.product.name}
                                        onChange={(e) => updateItemName(idx, e.target.value)}
                                        className="font-semibold text-xs bg-blue-50 border-b border-blue-200 outline-none w-full px-1.5 py-0.5 rounded"
                                      />
                                    ) : (
                                      <p className={`font-semibold text-xs leading-tight text-gray-800 ${item.is_sub ? 'ml-0.5' : ''}`}>{item.product.name}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => updateQty(idx, item.qty - 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">-</button>
                                    <span className="w-6 text-center text-xs font-bold text-gray-800">{item.qty}</span>
                                    <button onClick={() => updateQty(idx, item.qty + 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">+</button>
                                    <select value={item.satuan} onChange={(e) => updateItemSatuan(idx, e.target.value)} className="bg-gray-100 border-none rounded text-[10px] px-0.5 py-0.5 outline-none ml-1">
                                      <option value="PCS">PCS</option>
                                      <option value="SET">SET</option>
                                      <option value="Unit">Unit</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-gray-400">Rp</span>
                                    <input
                                      type="number"
                                      value={item.harga_jual_saat_itu}
                                      onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                      className="w-20 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 text-right outline-none focus:ring-1 focus:ring-[#3B82F6]"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right">
                                  <p className="font-bold text-[#3B82F6] text-xs leading-tight">Rp {subtotal.toLocaleString('id-ID')}</p>
                                </td>
                                <td className="py-2 px-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => toggleSubItem(idx)} className={`p-1 rounded transition-colors shadow-sm ${item.is_sub ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-400 hover:text-[#3B82F6]'}`} title="Jadikan Komponen Rakitan">
                                      <Plus size={12} />
                                    </button>
                                    <button onClick={() => removeItem(idx)} className="p-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors shadow-sm">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Cart Totals Summary */}
                  <div className="border-t border-gray-100 pt-4 mt-auto shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                      {/* Left side: Tax / Additional fee */}
                      <div className="w-full md:w-1/3">
                        <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-2 rounded-lg">
                          <span className="font-semibold">Pajak / Fee (%) :</span>
                          <input
                            type="number"
                            value={taxPercent}
                            onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right outline-none focus:border-[#3B82F6] font-bold"
                          />
                        </div>
                      </div>

                      {/* Right side: Grand Total */}
                      <div className="w-full md:w-1/2 flex flex-col items-end">
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">TOTAL KESELURUHAN</p>
                        <div className="flex items-center gap-2 bg-[#3B82F6]/5 rounded-lg px-4 py-2 border border-[#3B82F6]/20">
                          <span className="text-base font-bold text-[#3B82F6]">Rp</span>
                          <input
                            type="number"
                            value={customTotal}
                            onChange={(e) => setCustomTotal(parseFloat(e.target.value) || 0)}
                            className="text-right font-black text-2xl text-[#3B82F6] w-36 bg-transparent outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Pilih Produk & Numpad */}
              <div className="lg:col-span-1 flex flex-col gap-2.5 h-[calc(100vh-110px)]">

                {/* Product Search & List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col flex-1 min-h-0">
                  <div className="shrink-0 mb-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-2">Pilih Produk</h3>
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Cari Produk..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setVisibleProducts(30);
                          }}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setVisibleProducts(30);
                        }}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                      >
                        <option value="all">Semua Kategori</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 mt-6">Produk tidak ditemukan</p>
                    ) : (
                      <>
                        {filteredProducts.slice(0, visibleProducts).map(product => (
                          <div key={product.id} className="p-2.5 bg-white border border-gray-100 rounded-lg flex justify-between items-center hover:shadow-sm hover:border-[#3B82F6] transition-all group">
                            <div className="flex-1 pr-2">
                              <p className="font-bold text-xs text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                              <p className="text-[11px] font-black text-[#3B82F6] mt-0.5">Rp {product.harga_jual.toLocaleString('id-ID')}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-bold">Stok: {product.stok_saat_ini}</span>
                                <span className="text-[9px] text-gray-400 uppercase">{product.category?.name || 'UMUM'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => addItem(product)}
                              className="w-8 h-8 bg-[#3B82F6] text-white rounded-md flex items-center justify-center hover:bg-[#2563EB] shadow-sm transform active:scale-95 transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                        {visibleProducts < filteredProducts.length && (
                          <button
                            onClick={() => setVisibleProducts(prev => prev + 50)}
                            className="w-full py-2 mt-2 text-xs font-bold text-[#3B82F6] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                          >
                            Tampilkan Lebih Banyak ({filteredProducts.length - visibleProducts} lagi)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Numpad & Payment */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-green-500 p-3 mt-auto shrink-0">
                  <div className="mb-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">Tunai Dibayar</span>
                      <span className="font-black text-xl text-green-600">Rp {parseFloat(payment).toLocaleString('id-ID')}</span>
                    </div>

                    {parseFloat(payment) >= customTotal && customTotal > 0 && (
                      <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-100 mt-1.5">
                        <span className="font-bold text-xs">KEMBALIAN</span>
                        <span className="font-black text-sm">Rp {(parseFloat(payment) - customTotal).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {parseFloat(payment) < customTotal && parseFloat(payment) > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 text-amber-700 px-3 py-2 rounded-md border border-amber-200 mt-1.5 shadow-inner">
                        <span className="font-bold text-xs uppercase tracking-wider">SISA (DP)</span>
                        <span className="font-black text-sm">Rp {(customTotal - parseFloat(payment)).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
                      <button key={key} onClick={() => handleNumpadInput(key)} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">{key}</button>
                    ))}
                    <button onClick={() => handleNumpadInput('C')} className="h-9 rounded-md text-sm font-black bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors">C</button>
                    <button onClick={() => handleNumpadInput('0')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">0</button>
                    <button onClick={() => handleNumpadInput('00')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">00</button>

                    <button onClick={() => handleNumpadInput('PAS')} className="col-span-3 h-10 mt-1 rounded-md text-[11px] bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 active:bg-green-300 transition-colors font-black tracking-widest uppercase">Uang Pas / Transfer</button>

                    <button
                      onClick={handleSubmit}
                      disabled={saleItems.length === 0 || isSubmitting || payment === ''}
                      className={`col-span-3 h-10 mt-1 text-white rounded-lg font-black text-[13px] tracking-widest shadow-md transition-all active:scale-[0.98] uppercase disabled:bg-gray-300 disabled:shadow-none 
                        ${parseFloat(payment) < customTotal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                    >
                      {isSubmitting ? 'Memproses...' : (parseFloat(payment) < customTotal ? 'BAYAR DP (F10)' : 'Submit (F10)')}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Sales History Tab */
            <div className="space-y-3 no-print">
              {/* Filter Bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Cari Invoice</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input
                        type="text"
                        placeholder="Ketik no invoice..."
                        value={historySearch}
                        onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                      />
                    </div>
                  </div>
                  {/* Month Filter */}
                  <div className="min-w-[160px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filter Bulan</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input
                        type="month"
                        value={historyMonth}
                        onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                      />
                    </div>
                  </div>
                  {/* Reset */}
                  <div className="flex items-center gap-2">
                    {(historySearch || historyMonth) && (
                      <button
                        onClick={() => { setHistorySearch(''); setHistoryMonth(''); setHistoryPage(1); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Reset Filter
                      </button>
                    )}
                    <button
                      onClick={exportSalesCSV}
                      className="px-4 py-1.5 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      Export Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {(() => {
                // Filter logic
                const filtered = sales.filter((s) => {
                  const matchSearch = !historySearch || s.invoice.toLowerCase().includes(historySearch.toLowerCase());
                  const matchMonth = !historyMonth || s.tanggal.startsWith(historyMonth);
                  return matchSearch && matchMonth;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / historyPerPage));
                const paginated = filtered.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Invoice</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tanggal</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Channel</th>
                            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</th>
                            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginated.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">Tidak ada transaksi ditemukan.</td>
                            </tr>
                          ) : paginated.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 font-bold text-gray-800 text-xs">{sale.invoice}</td>
                              <td className="px-3 py-2 text-gray-600 text-xs">{new Date(sale.tanggal).toLocaleString('id-ID')}</td>
                              <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{sale.channel}</span></td>
                              <td className="px-3 py-2 text-right font-bold text-gray-800 text-xs">
                                Rp {Number(sale.total_penjualan).toLocaleString('id-ID')}
                                {sale.status_bayar === 'dp' && (
                                  <div className="text-[10px] text-amber-600 mt-0.5 whitespace-nowrap">Sisa: Rp {Number(sale.sisa_bayar).toLocaleString('id-ID')}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {sale.status_bayar === 'dp' ? (
                                    <button onClick={() => setPelunasanTarget(sale)} className="p-1 px-2 text-amber-600 bg-amber-50 hover:bg-amber-100 font-bold rounded-md transition-colors text-[10px] mr-1" title="Lunasi Sisa Pembayaran">
                                      LUNASI
                                    </button>
                                  ) : (
                                    <span className="p-1 px-2 text-green-600 bg-green-50 font-bold rounded-md text-[10px] mr-1 pointer-events-none">
                                      LUNAS
                                    </span>
                                  )}
                                  <button onClick={() => { setLastSale(sale); setTimeout(() => window.print(), 100); }} className="p-1.5 text-gray-400 hover:text-[#3B82F6] hover:bg-blue-50 rounded-md transition-colors" title="Cetak Faktur">
                                    <Printer size={15} />
                                  </button>
                                  <button onClick={() => setVoidTarget(sale)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Void / Batalkan Transaksi">
                                    <Ban size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
                      <p className="text-[10px] text-gray-500 font-medium">
                        Menampilkan {paginated.length} dari {filtered.length} transaksi
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage <= 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={14} className="text-gray-600" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - historyPage) <= 1)
                          .map((p, idx, arr) => (
                            <span key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && (
                                <span className="text-gray-400 text-[10px] px-0.5">...</span>
                              )}
                              <button
                                onClick={() => setHistoryPage(p)}
                                className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${historyPage === p
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
                          onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                          disabled={historyPage >= totalPages}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={14} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ====== VOID CONFIRMATION MODAL ====== */}
      {voidTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-in">
            {/* Red header strip */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-4 text-center">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <Ban size={24} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-sm">Void Transaksi</h3>
              <p className="text-red-100 text-[11px] mt-0.5">Aksi ini tidak bisa dibatalkan</p>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">Kepada Yth.</span>
                       <span className="font-bold">: {voidTarget.username_pembeli || 'UMUM'}</span>
                    </div>
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">Alamat</span>
                       <span>: {voidTarget.alamat_pembeli || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">No. HP</span>
                       <span>: {voidTarget.telepon_pembeli || '-'}</span>
                    </div>
                  </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Tanggal</span>
                  <span className="text-gray-700">{new Date(voidTarget.tanggal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Channel</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{voidTarget.channel}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-xs">
                  <span className="text-gray-500 font-bold">Total</span>
                  <span className="font-black text-red-600 text-sm">Rp {Number(voidTarget.total_penjualan).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>⚠️ Perhatian:</strong> Stok barang yang terjual pada transaksi ini akan <strong>otomatis dikembalikan</strong> ke inventaris.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setVoidTarget(null)}
                  disabled={isVoiding}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmVoid}
                  disabled={isVoiding}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Ban size={13} />
                  {isVoiding ? 'Memproses...' : 'Ya, Void Transaksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== PELUNASAN DP MODAL ====== */}
      {pelunasanTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-in">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 text-center">
              <h3 className="text-white font-bold text-sm">Pelunasan Tagihan (DP)</h3>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-bold text-gray-800">{pelunasanTarget.invoice}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Tagihan</span><span className="font-bold text-gray-800">Rp {Number(pelunasanTarget.total_penjualan).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sudah Dibayar</span><span className="font-bold text-gray-800">Rp {Number(pelunasanTarget.pembayaran).toLocaleString('id-ID')}</span></div>
                <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="text-gray-500 font-bold">Sisa Tagihan</span><span className="font-black text-amber-600 text-sm">Rp {Number(pelunasanTarget.sisa_bayar).toLocaleString('id-ID')}</span></div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nominal Pembayaran</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    value={pelunasanInput}
                    onChange={(e) => setPelunasanInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                   <button onClick={() => setPelunasanInput(pelunasanTarget.sisa_bayar?.toString() || '0')} className="flex-1 py-1.5 bg-amber-50 text-amber-600 font-bold text-[10px] rounded uppercase hover:bg-amber-100 transition-colors">Lunasi Semua (Uang Pas)</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPelunasanTarget(null); setPelunasanInput(''); }} disabled={isPelunasanSubmitting} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
                <button onClick={handlePelunasanSubmit} disabled={isPelunasanSubmitting} className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
                  {isPelunasanSubmitting ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAKTUR TEMPLATE - Continuous Form 21cm x 14.5cm */}
      <div id="print-area" className="faktur-print bg-white text-black font-sans" style={{ width: '100%', margin: '0' }}>
        {lastSale && (
          <div className="bg-white" style={{ fontSize: '14px', fontWeight: 'normal', fontFamily: '"Courier New", Courier, monospace', lineHeight: '1.2' }}>
            {/* ===== HEADER ===== */}
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td style={{ width: '65%', verticalAlign: 'top', padding: '0' }}>
                    <div className="flex items-start gap-3">
                      {settings.store_logo && (
                        <img
                          src={`http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:8000/storage/${settings.store_logo}`}
                          alt="Logo"
                          style={{ height: '52px', width: '52px', objectFit: 'contain' }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '19px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1' }}>{settings.store_name || 'CAHAYA KOMPUTER ID'}</div>
                        <div style={{ fontSize: '13px', marginTop: '2px', fontWeight: 'normal' }}>{settings.store_address || 'Alamat Toko Belum Diatur'}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'normal' }}>Telepon/HP : {settings.store_phone || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '35%', verticalAlign: 'bottom', textAlign: 'right', padding: '0', paddingBottom: '2px' }}>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1', display: 'inline-block' }}>FAKTUR PENJUALAN</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Customer & Transaction Info */}
            <table className="w-full border-collapse" style={{ fontSize: '13px', marginTop: '4px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '65%', verticalAlign: 'top', padding: '0' }}>
                    <div>
                      <div style={{ marginBottom: '2px' }}>
                        <div>Kepada Yth. :</div>
                        <div style={{ fontSize: '15px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '1px' }}>{lastSale.username_pembeli || 'UMUM'}</div>
                      </div>
                      <table className="border-collapse" style={{ fontSize: '13px', marginTop: '1px' }}>
                        <tbody>
                          <tr><td style={{ width: '68px' }}>Alamat</td><td style={{ width: '10px' }}>:</td><td>{lastSale.alamat_pembeli || '-'}</td></tr>
                          <tr><td>No. HP</td><td>:</td><td>{lastSale.telepon_pembeli || '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                  <td style={{ width: '35%', verticalAlign: 'top', padding: '0' }}>
                    <table className="w-full border-collapse" style={{ fontSize: '13px', textAlign: 'left', lineHeight: '1.2' }}>
                      <tbody>
                        <tr><td style={{ width: '110px' }}>Tanggal / Jam</td><td style={{ width: '10px' }}>:</td><td>{new Date(lastSale.tanggal).toLocaleDateString('id-ID')} {new Date(lastSale.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                        <tr><td>No. Faktur</td><td>:</td><td className="uppercase">{lastSale.invoice}</td></tr>
                        <tr><td>Kasir</td><td>:</td><td className="uppercase">{lastSale.user?.name || user?.name || 'ADMIN'}</td></tr>
                        <tr><td>Pemesanan</td><td>:</td><td className="uppercase">{lastSale.channel}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table className="w-full border-collapse" style={{ fontSize: '14px', tableLayout: 'fixed', marginTop: '4px' }}>
              <thead>
                <tr style={{ borderTop: '1.5px solid black', borderBottom: '1.5px solid black' }}>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '30px' }}>No.</th>
                  <th style={{ padding: '3px 2px', textAlign: 'left', width: 'auto' }}>Nama Produk</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '40px' }}>Qty</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '60px' }}>Satuan</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '110px' }}>Harga Satuan</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '110px' }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let printCounter = 1;
                  return [...lastSale.items].map((item, idx) => {
                    const isSubItem = !!item.parent_id;
                    const rowNum = isSubItem ? '' : `${printCounter++}.`;
                    return (
                      <tr key={idx} style={{ lineHeight: '1.15' }}>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{rowNum}</td>
                        <td style={{ padding: '1px 2px', paddingLeft: isSubItem ? '16px' : '2px' }}>
                          {item.product?.name || item.manual_name || 'Unit'}
                        </td>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{item.satuan || 'PCS'}</td>
                        <td style={{ padding: '1px 2px', textAlign: 'right' }}>
                          {isSubItem ? '' : Number(item.harga_jual_saat_itu).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '1px 2px', textAlign: 'right' }}>
                          {isSubItem ? '' : (item.qty * Number(item.harga_jual_saat_itu)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Line */}
            <div style={{ borderBottom: '1.5px solid black', margin: '3px 0' }}></div>

            {/* Keterangan + Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
              <div style={{ width: '50%', fontSize: '13px' }}>
                <div>Keterangan:</div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2', marginTop: '2px' }}>
                  {settings.store_notes || 'Terima kasih atas kepercayaan Anda.\nMohon simpan Faktur ini sebagai bukti transaksi.'}
                </div>
                <div style={{ marginTop: '6px' }}>Berlaku Untuk Claim Garansi</div>
              </div>

              <div style={{ width: '45%', fontSize: '14px' }}>
                <table className="w-full border-collapse" style={{ lineHeight: '1' }}>
                  <tbody>
                    <tr><td style={{ padding: '0', textAlign: 'left' }}>Subtotal :</td><td style={{ textAlign: 'right' }}>{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td></tr>
                    <tr><td style={{ padding: '0', textAlign: 'left' }}>Pajak ({lastSale?.tax_percent || 0}%) :</td><td style={{ textAlign: 'right' }}>{Number(lastSale?.tax_amount || 0).toLocaleString('id-ID')}</td></tr>
                    <tr style={{ borderTop: '1.5px solid black' }}>
                      <td style={{ padding: '1px 0 0 0', textAlign: 'left', fontSize: '15px' }}>Total :</td>
                      <td style={{ padding: '1px 0 0 0', textAlign: 'right', fontSize: '15px', fontWeight: 'bold' }}>{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td>
                    </tr>
                    <tr><td style={{ padding: '0', textAlign: 'left' }}>Tunai :</td><td style={{ textAlign: 'right' }}>{Number(lastSale?.pembayaran || 0).toLocaleString('id-ID')}</td></tr>
                    {lastSale?.status_bayar === 'dp' && (
                      <tr><td style={{ padding: '1px 0 0 0', textAlign: 'left', fontWeight: 'bold' }}>Sisa (DP) :</td><td style={{ padding: '1px 0 0 0', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid black' }}>{Number(lastSale?.sisa_bayar || 0).toLocaleString('id-ID')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Signature Section */}
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div style={{ textAlign: 'center', width: '160px' }}>
                <p>Hormat Kami,</p>
                <div style={{ marginTop: '40px', textDecoration: 'underline', textTransform: 'uppercase' }}>{settings.store_name || 'Cahaya Komputer'}</div>
              </div>
              <div style={{ textAlign: 'center', width: '160px' }}>
                <p>Diterima Oleh,</p>
                <div style={{ marginTop: '40px' }}>___________________</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .faktur-print { display: none; }

        @media print {
          html, body { 
            visibility: hidden !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #print-area {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 21cm !important;
            margin: 0 !important;
            padding: 7mm 5mm 2mm 5mm !important;
            height: auto !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          #print-area, #print-area * {
            visibility: visible !important;
            color: #000 !important;
            border-color: #000 !important;
            background: transparent !important;
            font-family: "Draft", "Epson Draft", "Epson Roman", "Courier New", Courier, monospace !important;
            font-weight: bold !important;
            -webkit-font-smoothing: none !important;
            text-rendering: optimizeSpeed !important;
          }

          @page {
            size: 21.00cm 13.97cm;
            margin: 0;
          }
        }
      `}</style>
      {/* Template Modals */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Pilih Template Transaksi</h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">&times;</button>
             </div>
             <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar space-y-2 bg-gray-50/50">
                {posTemplates.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-sm">Belum ada template yang disimpan.</div>
                ) : (
                  posTemplates.map((t: any) => (
                    <div key={t.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-emerald-300 transition-all flex justify-between items-center group">
                       <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(t.items)}>
                          <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">{t.items.length} Barang • Dibuat {new Date(t.id).toLocaleDateString('id-ID')}</p>
                       </div>
                       <button onClick={() => deleteTemplate(t.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                       </button>
                    </div>
                  ))
                )}
             </div>
             <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end">
                <button onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">TUTUP</button>
             </div>
          </div>
        </div>
      )}

      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-amber-500 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Save size={18}/> Simpan sbg Template Baru</h3>
                <button onClick={() => setIsSaveTemplateModalOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">&times;</button>
             </div>
             <div className="p-5 space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nama Template</label>
                   <input 
                    type="text" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Contoh: Paket Service A atau Paket PC Gaming..."
                    className="w-full text-sm font-bold bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl outline-none focus:ring-2 ring-amber-400/50 transition-all"
                    autoFocus
                   />
                </div>
                <p className="text-[10px] text-gray-500 italic bg-amber-50 p-2 rounded-lg border border-amber-100">
                   Seluruh barang yang ada di keranjang ({saleItems.length} item) akan disimpan ke dalam template ini.
                </p>
             </div>
             <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={() => setIsSaveTemplateModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors">BATAL</button>
                <button 
                  onClick={saveTemplate} 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  SIMPAN SEKARANG
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
