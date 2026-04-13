import { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, CheckCircle, Download, Search, ChevronLeft, ChevronRight, Trash2, Calendar, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import api from '../api';
import { toast } from 'sonner';

interface Distributor {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  harga_beli: number;
}

interface PurchaseItem {
  product_id: number;
  qty: number;
  harga_beli: number;
  product?: Product;
}

interface Purchase {
  id: number;
  invoice: string;
  distributor_id: number;
  distributor?: Distributor;
  tanggal: string;
  total_pembelian: number;
  terbayar: number;
  status_pembayaran: 'lunas' | 'hutang';
  jatuh_tempo?: string | null;
  items?: PurchaseItem[];
}

export default function PembelianTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'lunas' | 'hutang'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedDetailPurchase, setSelectedDetailPurchase] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState('');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Quick Product Modal
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [currentRowIdx, setCurrentRowIdx] = useState<number | null>(null);
  const [quickProductFormData, setQuickProductFormData] = useState({
    name: '',
    category_id: '',
    harga_jual: ''
  });

  interface FormDataState {
    invoice: string;
    distributor_id: string;
    tanggal: string;
    total_pembelian: string;
    terbayar: string;
    status_pembayaran: 'lunas' | 'hutang';
    jatuh_tempo: string;
    items: {
      product_id: string;
      qty: string;
      harga_beli: string;
    }[];
  }

  const [formData, setFormData] = useState<FormDataState>({
    invoice: '',
    distributor_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    total_pembelian: '0',
    terbayar: '0',
    status_pembayaran: 'lunas',
    jatuh_tempo: '',
    items: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, filterMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, distributorsRes, productsRes, categoriesRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/distributors'),
        api.get('/products'),
        api.get('/categories')
      ]);
      setPurchases(purchasesRes.data);
      setDistributors(distributorsRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchesFilter = filter === 'all' || p.status_pembayaran === filter;
        const matchesMonth = filterMonth === '' || p.tanggal.startsWith(filterMonth);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          p.invoice?.toLowerCase().includes(searchLower) ||
          p.distributor?.name.toLowerCase().includes(searchLower);
        
        return matchesFilter && matchesMonth && matchesSearch;
      })
      .sort((a, b) => b.id - a.id);
  }, [purchases, filter, filterMonth, searchQuery]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditId(null);
    setFormData({
      invoice: '',
      distributor_id: distributors.length > 0 ? distributors[0].id.toString() : '',
      tanggal: new Date().toISOString().split('T')[0],
      total_pembelian: '0',
      terbayar: '0',
      status_pembayaran: 'lunas',
      jatuh_tempo: '',
      items: [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const total = parseFloat(formData.total_pembelian);
      const terbayar = parseFloat(formData.terbayar);
      const payload = {
        ...formData,
        invoice: formData.invoice || undefined, // Allow backend to generate if empty
        distributor_id: parseInt(formData.distributor_id),
        total_pembelian: total,
        terbayar: terbayar,
        status_pembayaran: (terbayar >= total) ? 'lunas' : 'hutang',
        jatuh_tempo: (terbayar < total && formData.jatuh_tempo) ? formData.jatuh_tempo : undefined,
        items: formData.items.map(i => ({
          product_id: parseInt(i.product_id),
          qty: parseInt(i.qty),
          harga_beli: parseFloat(i.harga_beli),
        }))
      };

      if (isEditMode && editId) {
        await api.put(`/purchases/${editId}`, payload);
        toast.success('Pembelian berhasil diperbarui');
      } else {
        await api.post('/purchases', payload);
        toast.success('Pembelian berhasil disimpan');
      }
      
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembelian');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    // Suggest paying off the rest
    setPayAmount((purchase.total_pembelian - purchase.terbayar).toString());
    setIsPayModalOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    try {
      setIsSubmitting(true);
      const currentTerbayar = Number(selectedPurchase.terbayar);
      const newPayment = parseFloat(payAmount);
      const totalTerbayar = currentTerbayar + newPayment;

      await api.put(`/purchases/${selectedPurchase.id}`, { 
        terbayar: totalTerbayar,
        distributor_id: selectedPurchase.distributor_id,
        tanggal: selectedPurchase.tanggal,
        total_pembelian: selectedPurchase.total_pembelian,
        invoice: selectedPurchase.invoice,
        jatuh_tempo: selectedPurchase.jatuh_tempo
      });
      setIsPayModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetailModal = (purchase: Purchase) => {
    setSelectedDetailPurchase(purchase);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setIsEditMode(true);
    setEditId(purchase.id);
    setFormData({
      invoice: purchase.invoice || '',
      distributor_id: purchase.distributor_id.toString(),
      tanggal: purchase.tanggal,
      total_pembelian: purchase.total_pembelian.toString(),
      terbayar: purchase.terbayar.toString(),
      status_pembayaran: purchase.status_pembayaran,
      jatuh_tempo: purchase.jatuh_tempo || '',
      items: (purchase.items || []).map(item => ({
        product_id: item.product_id.toString(),
        qty: item.qty.toString(),
        harga_beli: item.harga_beli.toString(),
      })),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (purchase: Purchase) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pembelian ${purchase.invoice || ''}?`)) {
      try {
        await api.delete(`/purchases/${purchase.id}`);
        toast.success('Pembelian berhasil dihapus');
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menghapus pembelian');
      }
    }
  };

  const handleOpenQuickProductModal = (idx: number) => {
    setCurrentRowIdx(idx);
    setQuickProductFormData({
      name: '',
      category_id: categories.length > 0 ? categories[0].id.toString() : '',
      harga_jual: ''
    });
    setIsQuickProductModalOpen(true);
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductFormData.name || !quickProductFormData.category_id || currentRowIdx === null) return;

    try {
      setIsSubmitting(true);
      const purchasePrice = parseFloat(formData.items[currentRowIdx].harga_beli || '0');
      
      const payload = {
        name: quickProductFormData.name,
        category_id: parseInt(quickProductFormData.category_id),
        harga_beli: purchasePrice,
        harga_jual: parseFloat(quickProductFormData.harga_jual || '0'),
        stok_saat_ini: 0 // New product starts with 0 stock, will be increased by purchase
      };

      const res = await api.post('/products', payload);
      const newProduct = res.data.data || res.data; // Backend might return { data: {id, ...} } or {id, ...}
      
      toast.success(`Produk ${quickProductFormData.name} berhasil ditambahkan!`);
      
      // Refresh products list
      const productsRes = await api.get('/products');
      setProducts(productsRes.data);

      // Auto-select for the current row
      const newItems = [...formData.items];
      newItems[currentRowIdx] = {
        ...newItems[currentRowIdx],
        product_id: newProduct.id.toString(),
        harga_beli: purchasePrice.toString()
      };
      setFormData(prev => ({ ...prev, items: newItems }));

      setIsQuickProductModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = (items: typeof formData.items) => {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.harga_beli || '0') * parseInt(item.qty || '0')), 0);
    setFormData(prev => ({ ...prev, total_pembelian: total.toString() }));
  };

  const handleAddItem = () => {
    const newItem = { product_id: '', qty: '1', harga_beli: '0' };
    const newItems = [...formData.items, newItem];
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const handleItemChange = (index: number, field: keyof typeof formData.items[0], value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-update harga_beli if product is changed
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id.toString() === value);
      if (selectedProduct) {
        newItems[index].harga_beli = selectedProduct.harga_beli.toString();
      }
    }

    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const exportPurchasesCSV = () => {
    const worksheetData: any[][] = [
      ["LAPORAN SELURUH DATA PEMBELIAN"],
      [],
      ["Invoice", "Distributor", "Tanggal", "Status", "Total Pembelian", "Terbayar", "Sisa Hutang"]
    ];
    
    // Use the filtered or all
    const filtered = filter === 'all' 
      ? purchases 
      : purchases.filter(p => p.status_pembayaran === filter);

    filtered.forEach(p => {
      const hutang = p.total_pembelian - p.terbayar;
      worksheetData.push([
        p.invoice,
        p.distributor?.name || '-',
        p.tanggal,
        p.status_pembayaran,
        p.total_pembelian,
        p.terbayar,
        hutang
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 20 }, // Invoice
      { wch: 25 }, // Distributor
      { wch: 15 }, // Tanggal
      { wch: 20 }, // Status
      { wch: 20 }, // Total Pembelian
      { wch: 15 }, // Terbayar
      { wch: 15 }  // Sisa Hutang
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pembelian");
    
    XLSX.writeFile(workbook, `Riwayat_Pembelian_${filter}.xlsx`);
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-40 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="flex gap-3"><div className="flex-1 h-9 bg-gray-200 rounded-lg" /><div className="w-48 h-9 bg-gray-200 rounded-lg" /></div></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Data Pembelian</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola pembelian dari distributor</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          <Plus size={14} />
          Tambah Pembelian
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Pembelian</p>
          <p className="text-xl font-bold text-[#3B82F6]">
            Rp {purchases.reduce((sum, p) => sum + Number(p.total_pembelian), 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Sudah Lunas</p>
          <p className="text-xl font-bold text-green-600">
            {purchases.filter((p) => p.status_pembayaran === 'lunas').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Belum Lunas (Hutang)</p>
          <p className="text-xl font-bold text-red-600">
            {purchases.filter((p) => p.status_pembayaran === 'hutang').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === 'all'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('lunas')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === 'lunas'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Lunas
            </button>
            <button
              onClick={() => setFilter('hutang')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === 'hutang'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Belum Lunas
            </button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 w-full sm:w-auto focus-within:ring-1 focus-within:ring-[#3B82F6] focus-within:border-[#3B82F6] transition-all overflow-hidden">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input 
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-xs px-2 py-2 outline-none font-medium text-gray-700 w-full cursor-pointer"
              />
            </div>
            
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 w-full sm:w-64 focus-within:ring-1 focus-within:ring-[#3B82F6] focus-within:border-[#3B82F6] transition-all">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Cari invoice atau distributor..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs px-2 py-2 outline-none font-medium" 
              />
            </div>
          </div>
        </div>
        <button
          onClick={exportPurchasesCSV}
          className="px-4 py-2 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Download size={14} />
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Invoice</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Distributor</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tanggal</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Sisa Hutang</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Jatuh Tempo</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Status</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Pencarian pembelian tidak ditemukan
                  </td>
                </tr>
              ) : (
                currentItems.map((purchase) => {
                  const total = Number(purchase.total_pembelian);
                const terbayar = Number(purchase.terbayar);
                const sisa = total - terbayar;
                return (
                  <tr key={purchase.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-xs">
                      <p className="font-bold text-gray-800">{purchase.invoice || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{purchase.distributor?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {new Date(purchase.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-medium text-gray-800">
                      Rp {total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {sisa > 0 ? (
                        <span className="text-red-600 font-medium">
                          Rp {sisa.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {(sisa > 0 && purchase.jatuh_tempo) ? new Date(purchase.jatuh_tempo).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${purchase.status_pembayaran === 'lunas'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {purchase.status_pembayaran === 'lunas' ? 'Lunas' : 'Hutang'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <div className="flex gap-2 justify-center">
                        {sisa > 0 && (
                          <button
                            onClick={() => handleOpenPayModal(purchase)}
                            title="Bayar Cicilan"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(purchase)}
                          title="Edit Pembelian"
                          className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDetailModal(purchase)}
                          title="Lihat Detail Barang"
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase)}
                          title="Hapus Pembelian"
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
          <p className="text-[10px] text-gray-500 font-medium">
            Menampilkan {currentItems.length} dari {filteredPurchases.length} riwayat pembelian
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-gray-400 text-[10px] px-0.5">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${
                      currentPage === p
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">
                {isEditMode ? 'Edit Pembelian' : 'Tambah Pembelian'}
              </h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form id="purchaseForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      No. Invoice (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                      placeholder="Dibebaskan ke sistem jika kosong"
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Distributor</label>
                  <select
                    required
                    value={formData.distributor_id}
                    onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] outline-none"
                  >
                    <option value="" disabled>Pilih Distributor</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Items Input */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-medium text-gray-700">Barang yang dibeli</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-[11px] flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      <Plus size={14} /> Tambah Barang
                    </button>
                  </div>

                  {formData.items.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">Tidak ada barang spesifik dicatat (Hanya mencatat total).</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] min-h-[120px] overflow-y-auto pr-1">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-white p-2 border border-gray-200 rounded">
                           <div className="pt-5 px-1 text-center">
                            <span className="text-xs font-bold text-gray-400">{idx + 1}.</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] text-gray-500 mb-1">Produk</label>
                            <div className="flex gap-1 items-start">
                              <Select
                                className="text-xs flex-1"
                                options={products.map(p => ({ value: p.id.toString(), label: p.name }))}
                                value={
                                  item.product_id
                                    ? {
                                      value: item.product_id.toString(),
                                      label: products.find(p => p.id.toString() === item.product_id.toString())?.name || ''
                                    }
                                    : null
                                }
                                onChange={(selectedOption) => {
                                  if (selectedOption) {
                                    handleItemChange(idx, 'product_id', selectedOption.value);
                                  }
                                }}
                                placeholder="Cari..."
                                isSearchable
                                menuPortalTarget={document.body}
                                styles={{
                                  control: (base) => ({ ...base, minHeight: '30px', height: '30px' }),
                                  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                  input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                  option: (base) => ({ ...base, fontSize: '11px', padding: '6px 8px' }),
                                  singleValue: (base) => ({ ...base, fontSize: '11px' }),
                                  indicatorsContainer: (base) => ({ ...base, height: '30px' }),
                                  menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenQuickProductModal(idx)}
                                title="Tambah Produk Baru"
                                className="h-[30px] w-8 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors shrink-0"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="w-20">
                            <label className="block text-[11px] text-gray-500 mb-1">Qty</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs"
                            />
                          </div>
                          <div className="w-32">
                            <label className="block text-[11px] text-gray-500 mb-1">Harga Satuan</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={item.harga_beli}
                              onChange={(e) => handleItemChange(idx, 'harga_beli', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="mt-4 p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Pembelian (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.total_pembelian}
                      onChange={(e) => setFormData({ ...formData, total_pembelian: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] outline-none bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Terbayar (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.terbayar}
                      onChange={(e) => setFormData({ ...formData, terbayar: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                </div>
                {Number(formData.total_pembelian) > Number(formData.terbayar) && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 space-y-3">
                    <p className="text-xs text-red-600 font-medium">
                      Sisa hutang: Rp {(Number(formData.total_pembelian) - Number(formData.terbayar)).toLocaleString('id-ID')}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-red-700 mb-1">Tanggal Jatuh Tempo</label>
                      <input
                        type="date"
                        required
                        value={formData.jatuh_tempo}
                        onChange={(e) => setFormData({ ...formData, jatuh_tempo: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-red-200 rounded-lg focus:ring-1 text-xs font-medium bg-white focus:ring-red-400 outline-none text-red-800"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="purchaseForm"
                disabled={isSubmitting}
                className="px-3 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {isPayModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Bayar Cicilan Hutang</h3>
            </div>
            <form onSubmit={handlePay} className="p-4 space-y-4">
              <p className="text-xs text-gray-600">
                Sisa hutang untuk Invoice <b>{selectedPurchase.invoice}</b> adalah Rp {(Number(selectedPurchase.total_pembelian) - Number(selectedPurchase.terbayar)).toLocaleString('id-ID')}
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  min="0"
                  max={Number(selectedPurchase.total_pembelian) - Number(selectedPurchase.terbayar)}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-green-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {isDetailModalOpen && selectedDetailPurchase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">
                Detail Invoice: {selectedDetailPurchase.invoice || '-'}
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Distributor</p>
                  <p className="font-bold text-xs text-gray-800">{selectedDetailPurchase.distributor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tanggal</p>
                  <p className="font-bold text-xs text-gray-800">{new Date(selectedDetailPurchase.tanggal).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <h4 className="font-medium text-gray-800 mb-3 border-b pb-2">Daftar Barang Dibeli</h4>

              {!selectedDetailPurchase.items || selectedDetailPurchase.items.length === 0 ? (
                <p className="text-gray-500 italic text-xs text-center py-3 bg-gray-50 rounded">
                  Tidak ada rincian barang untuk transaksi ini. (Hanya nominal total).
                </p>
              ) : (
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-700 font-medium">Produk</th>
                        <th className="text-right px-3 py-2 text-gray-700 font-medium w-24">Qty</th>
                        <th className="text-right px-3 py-2 text-gray-700 font-medium w-32">Harga Beli</th>
                        <th className="text-right px-3 py-2 text-gray-700 font-medium w-32">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedDetailPurchase.items.map((item, idx) => {
                        const subtotal = Number(item.qty) * Number(item.harga_beli);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{item.product?.name || `Product ID: ${item.product_id}`}</td>
                            <td className="px-3 py-2 text-right">{item.qty}</td>
                            <td className="px-3 py-2 text-right">Rp {Number(item.harga_beli).toLocaleString('id-ID')}</td>
                            <td className="px-3 py-2 text-right font-medium">Rp {subtotal.toLocaleString('id-ID')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Total Keseluruhan</td>
                        <td className="px-3 py-2 text-right text-[#3B82F6]">
                          Rp {Number(selectedDetailPurchase.total_pembelian).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Terbayar</td>
                        <td className="px-3 py-2 text-right text-green-600">
                          Rp {Number(selectedDetailPurchase.terbayar).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      {Number(selectedDetailPurchase.total_pembelian) > Number(selectedDetailPurchase.terbayar) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-red-600">Sisa Hutang</td>
                          <td className="px-3 py-2 text-right text-red-600">
                            Rp {(Number(selectedDetailPurchase.total_pembelian) - Number(selectedDetailPurchase.terbayar)).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Product Modal */}
      {isQuickProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl modal-content w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">Tambah Produk Cepat</h3>
              <button 
                onClick={() => setIsQuickProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleQuickProductSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: HDD External 1TB..."
                  value={quickProductFormData.name}
                  onChange={(e) => setQuickProductFormData({ ...quickProductFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-medium bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                  Kategori
                </label>
                <select
                  required
                  value={quickProductFormData.category_id}
                  onChange={(e) => setQuickProductFormData({ ...quickProductFormData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-medium bg-gray-50"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                  Harga Jual
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Rp 0"
                  value={quickProductFormData.harga_jual}
                  onChange={(e) => setQuickProductFormData({ ...quickProductFormData, harga_jual: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-bold text-blue-600 bg-blue-50/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsQuickProductModalOpen(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:opacity-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
