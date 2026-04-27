import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Upload, Tags, Package, Banknote, Box, Percent, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeContext } from '../context/ThemeContext';
import Select from 'react-select';
import api from '../api';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category_id: number;
  harga_beli: number;
  harga_jual: number;
  stok_saat_ini: number;
  category?: Category;
}

export default function ProdukTab() {
  const { theme } = useThemeContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Category Creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    harga_beli: '',
    harga_jual: '',
    stok_saat_ini: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Custom Delete Confirm
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, id: number | null, name: string}>({isOpen: false, id: null, name: ''});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Mohon upload file dg format .csv');
      e.target.value = '';
      return;
    }

    const parseCSVLine = (text: string, separator: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map(s => s.replace(/^"|"$/g, '').trim());
    };

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Detect if Excel in Indonesia saved it with semicolons
        const separator = text.includes(';') ? ';' : ',';
        const lines = text.split('\n');
        const productsRaw = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = parseCSVLine(line, separator);
          
          let k = ''; let n = ''; let hb = 0; let hj = 0; let s = 0; let c = 'UMUM';

          // Heuristik mendeteksi jika Excel menghilangkan kolom pertama (Kolom A / Barcode) karena kosong.
          // Jika kolom ke-2 dan ke-3 adalah angka murni (Harga Beli & Jual), berarti kolom pertama pasti Nama.
          const col1IsNumber = /^\d+$/.test((cols[1] || '').replace(/[^0-9]/g, ""));
          const col2IsNumber = /^\d+$/.test((cols[2] || '').replace(/[^0-9]/g, ""));

          if (cols.length === 5 || (col1IsNumber && col2IsNumber)) {
            // Kolom Kode ter-skip oleh Excel
            n = cols[0] || '';
            hb = parseFloat((cols[1] || '0').replace(/[^0-9]/g, ""));
            hj = parseFloat((cols[2] || '0').replace(/[^0-9]/g, ""));
            s = parseInt((cols[3] || '0').replace(/[^0-9]/g, ""));
            c = cols[4] || 'UMUM';
          } else if (cols.length >= 6) {
            // Format 6 kolom lengkap
            k = cols[0] || '';
            n = cols[1] || '';
            hb = parseFloat((cols[2] || '0').replace(/[^0-9]/g, ""));
            hj = parseFloat((cols[3] || '0').replace(/[^0-9]/g, ""));
            s = parseInt((cols[4] || '0').replace(/[^0-9]/g, ""));
            c = cols[5] || 'UMUM';
          }

          if (n && n.trim() !== '') {
            productsRaw.push({
              kode: k.trim(),
              name: n.trim(),
              harga_beli: isNaN(hb) ? 0 : hb,
              harga_jual: isNaN(hj) ? 0 : hj,
              stok_saat_ini: isNaN(s) ? 0 : s,
              category_name: c.trim() || 'UMUM'
            });
          }
        }

        if (productsRaw.length > 0) {
          setIsSubmitting(true);
          const toastId = toast.loading(`Mengimpor ${productsRaw.length} produk...`);
          try {
            const res = await api.post('/products/bulk', productsRaw);
            toast.success(res.data.message || 'Berhasil impor produk', { id: toastId });
            fetchData();
          } catch(err: any) {
            toast.error(err.response?.data?.message || 'Gagal impor data', { id: toastId });
          } finally {
            setIsSubmitting(false);
          }
        } else {
          toast.warning('File CSV kosong atau format salah');
        }

      } catch (err) {
        toast.error('Gagal membaca file CSV');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(productsRes.data);
      setCategoriesList(categoriesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsSavingCategory(true);
      const res = await api.post('/categories', { name: newCategoryName });
      const newCat = res.data.data || res.data;
      setCategoriesList(prev => [...prev, newCat]);
      setFormData(prev => ({ ...prev, category_id: newCat.id.toString() }));
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast.success(`Kategori "${newCat.name}" berhasil dibuat`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat kategori');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', product?: Product) => {
    setModalMode(mode);
    setCurrentProduct(product || null);
    if (product) {
      setFormData({
        name: product.name,
        category_id: product.category_id.toString(),
        harga_beli: product.harga_beli.toString(),
        harga_jual: product.harga_jual.toString(),
        stok_saat_ini: product.stok_saat_ini.toString()
      });
    } else {
      setFormData({
        name: '',
        category_id: categoriesList.length > 0 ? categoriesList[0].id.toString() : '',
        harga_beli: '',
        harga_jual: '',
        stok_saat_ini: '0'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name,
        category_id: parseInt(formData.category_id),
        harga_beli: parseFloat(formData.harga_beli) || 0,
        harga_jual: parseFloat(formData.harga_jual) || 0,
        stok_saat_ini: parseInt(formData.stok_saat_ini) || 0
      };

      if (modalMode === 'add') {
        await api.post('/products', payload);
        toast.success(`Produk ${formData.name} berhasil ditambahkan!`);
      } else if (modalMode === 'edit' && currentProduct) {
        await api.put(`/products/${currentProduct.id}`, payload);
        toast.success(`Produk ${formData.name} berhasil diperbarui!`);
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0] as string[];
        toast.error(firstError[0] || 'Validasi gagal, silakan cek input Anda.');
      } else {
        toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`/products/${confirmDelete.id}`);
      toast.success(`Produk ${confirmDelete.name} telah dihapus.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus produk');
    }
    setConfirmDelete({ isOpen: false, id: null, name: '' });
  };

  const categories = ['all', ...new Set(products.map((p) => p.category?.name).filter(Boolean) as string[])];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || product.category?.name === selectedCategory;
      return matchSearch && matchCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-36"></div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
            <div className="w-full md:w-48 h-10 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-10 bg-gray-100 border-b border-gray-200"></div>
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 ml-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6 ml-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Daftar Produk</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola semua produk di toko</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 bg-emerald-600/10 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-600 hover:text-white transition-colors text-xs font-bold shadow-sm cursor-pointer border border-emerald-200">
            <Upload size={14} />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isSubmitting} />
          </label>
          <button
            onClick={() => handleOpenModal('add')}
            className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md hover:bg-[#2563EB] transition-colors text-xs font-medium shadow-sm"
          >
            <Plus size={14} />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Semua Kategori' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Nama Produk</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Kategori</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Harga Beli</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Harga Jual</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Stok</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Pencarian produk tidak ditemukan
                  </td>
                </tr>
              ) : (
                currentItems.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-bold text-xs text-gray-800">{product.name}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                      {product.category?.name || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-600 font-medium">
                    Rp {Number(product.harga_beli).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-[#3B82F6]">
                    Rp {Number(product.harga_jual).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${product.stok_saat_ini < 10
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                        }`}
                    >
                      {product.stok_saat_ini}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenModal('edit', product)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
          <p className="text-[10px] text-gray-500 font-medium">
            Menampilkan {currentItems.length} dari {filteredProducts.length} produk
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
                <span key={p}>
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Produk</p>
          <p className="text-xl font-bold text-[#3B82F6]">{filteredProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Stok</p>
          <p className="text-xl font-bold text-[#3B82F6]">
            {filteredProducts.reduce((sum, p) => sum + p.stok_saat_ini, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Stok Rendah</p>
          <p className="text-xl font-bold text-red-600">
            {filteredProducts.filter((p) => p.stok_saat_ini < 10).length}
          </p>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${modalMode === 'add' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {modalMode === 'add' ? <Plus size={20} /> : <Edit size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {modalMode === 'add' ? 'Tambah Produk Baru' : 'Edit Detail Produk'}
                  </h3>
                  <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wider">
                    {modalMode === 'add' ? 'Input stok & harga barang' : 'Perbarui informasi produk'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              <form id="productForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                    Nama Produk
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      required
                      placeholder="Cth: HDD External 1TB..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none text-xs font-medium bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                    Kategori Produk
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tags className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
                      <Select
                        required
                        placeholder="Pilih Kategori..."
                        value={categoriesList.find(c => c.id.toString() === formData.category_id) ? { 
                          value: formData.category_id, 
                          label: categoriesList.find(c => c.id.toString() === formData.category_id)?.name 
                        } : null}
                        onChange={(option: any) => setFormData({ ...formData, category_id: option?.value || '' })}
                        options={categoriesList.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
                        menuPlacement="auto"
                        styles={{
                          control: (base) => ({ 
                            ...base, 
                            minHeight: '38px', 
                            borderRadius: '8px', 
                            borderColor: theme === 'dark' ? '#334155' : '#E5E7EB', 
                            fontSize: '12px',
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#F9FAFB',
                            paddingLeft: '28px',
                            color: theme === 'dark' ? '#f8fafc' : '#1F2937'
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#FFFFFF',
                            borderColor: theme === 'dark' ? '#334155' : '#E5E7EB',
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected 
                              ? '#3B82F6' 
                              : state.isFocused 
                                ? theme === 'dark' ? '#334155' : '#F3F4F6' 
                                : 'transparent',
                            color: state.isSelected ? '#FFFFFF' : theme === 'dark' ? '#f8fafc' : '#1F2937',
                            fontSize: '11px',
                            fontWeight: state.isSelected ? 'bold' : 'normal',
                            padding: '8px 12px',
                            cursor: 'pointer'
                          }),
                          singleValue: (base) => ({
                            ...base,
                            fontSize: '12px',
                            fontWeight: '600',
                            color: theme === 'dark' ? '#f8fafc' : '#1F2937'
                          }),
                          input: (base) => ({
                            ...base,
                            color: theme === 'dark' ? '#f8fafc' : '#1F2937'
                          }),
                          placeholder: (base) => ({
                            ...base,
                            fontSize: '12px',
                            color: '#9CA3AF'
                          })
                        }}
                      />
                    </div>
                    {isAddingCategory ? (
                      <div className="flex gap-1 animate-in slide-in-from-right-2 duration-200">
                        <input 
                          type="text"
                          autoFocus
                          placeholder="Nama kategori..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                          className="w-32 px-2 py-1 border border-blue-400 rounded-lg text-xs outline-none bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-100"
                        />
                        <button 
                          type="button"
                          onClick={handleAddCategory}
                          disabled={isSavingCategory}
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsAddingCategory(false)}
                          className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors shrink-0 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300"
                        title="Tambah Kategori Baru"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                    Harga Beli (HPP)
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="number"
                      min="0"
                      placeholder="Rp 0"
                      value={formData.harga_beli}
                      onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs font-bold text-gray-700 bg-gray-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                    Harga Jual
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="number"
                      min="0"
                      placeholder="Rp 0"
                      value={formData.harga_jual}
                      onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-xs font-black text-blue-600 bg-blue-50/30 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">
                    Stok Saat Ini
                  </label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stok_saat_ini}
                      onChange={(e) => setFormData({ ...formData, stok_saat_ini: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none text-xs font-bold bg-gray-50/50"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-500 hover:bg-gray-200 bg-white rounded-lg transition-all font-bold text-xs uppercase tracking-widest border border-gray-200"
              >
                Batal
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
              >
                {isSubmitting ? 'Memproses...' : (
                  <>
                    <Plus size={16} />
                    {modalMode === 'add' ? 'Simpan Produk' : 'Simpan Perubahan'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Hapus Produk?</h3>
              <p className="text-xs text-gray-500 mb-5">
                Apakah Anda yakin ingin menghapus produk <span className="font-bold text-gray-800">"{confirmDelete.name}"</span>? Transaksi yang sudah menggunakan produk ini mungkin akan terpengaruh.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete({isOpen: false, id: null, name: ''})} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={executeDelete} className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Ya, Hapus</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
