import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Save, Search, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import api from '../api';

interface OpnameItem {
  product_id: number;
  product_name: string;
  stok_sistem: number;
  stok_fisik: number | '';
  selisih: number;
}

export default function StokOpnamePage() {
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const items = res.data.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        stok_sistem: p.stok_saat_ini,
        stok_fisik: p.stok_saat_ini,
        selisih: 0,
      }));
      setOpnameItems(items);
    } catch (err) {
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const updateStokFisik = (productId: number, value: string) => {
    const numericValue = value === '' ? '' : parseInt(value) || 0;
    setOpnameItems(
      opnameItems.map((item) =>
        item.product_id === productId
          ? { 
              ...item, 
              stok_fisik: numericValue, 
              selisih: numericValue === '' ? 0 : (numericValue as number) - item.stok_sistem 
            }
          : item
      )
    );
  };

  const totalSelisih = opnameItems.reduce((sum, item) => sum + Math.abs(item.selisih), 0);
  const itemsWithDiff = opnameItems.filter((item) => item.selisih !== 0);

  const handleSave = async () => {
    if (itemsWithDiff.length === 0) {
      toast.info('Tidak ada selisih stok untuk disimpan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: keterangan || 'Penyesuaian stok opname',
        items: itemsWithDiff.map(i => ({
          product_id: i.product_id,
          stok_sistem: i.stok_sistem,
          stok_fisik: i.stok_fisik as number,
          selisih: i.selisih
        }))
      };
      
      await api.post('/stok-opname', payload);
      toast.success('Stok opname berhasil disimpan!');
      setKeterangan('');
      fetchProducts();
    } catch (err) {
      toast.error('Gagal menyimpan hasil stok opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return opnameItems.filter((item) =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [opnameItems, searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const worksheetData: any[][] = [
      ["LEMBAR KERJA STOK OPNAME"],
      [],
      ["Nama Produk", "Stok Sistem", "Stok Fisik", "Selisih"]
    ];

    filteredItems.forEach(item => {
      worksheetData.push([
        item.product_name,
        item.stok_sistem,
        item.stok_fisik === '' ? '' : item.stok_fisik,
        item.selisih
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 55 }, // Nama Produk
      { wch: 15 }, // Stok Sistem
      { wch: 15 }, // Stok Fisik
      { wch: 15 }  // Selisih
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Opname");
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Data_Stok_Opname_${dateStr}.xlsx`);
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-40 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Stok Opname</h2>
          <p className="text-xs text-gray-500 mt-0.5">Periksa dan sesuaikan stok fisik dengan sistem</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Panduan:</strong> Masukkan jumlah stok fisik yang Anda hitung. Sistem akan otomatis menghitung selisih dan menyesuaikan stok.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Item Diperiksa</p>
          <p className="text-xl font-bold text-[#3B82F6]">{opnameItems.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Item dengan Selisih</p>
          <p className="text-xl font-bold text-red-600">
            {itemsWithDiff.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Selisih</p>
          <p className="text-base font-bold text-gray-800 tracking-tight">{totalSelisih}</p>
        </div>
      </div>

      {/* Opname Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col min-h-0">
        <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Keterangan Opname
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Opname rutin akhir bulan"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Cari Produk
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Nama Produk</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Stok Sistem</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Stok Fisik</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((item) => (
                <tr key={item.product_id} className={`transition-colors border-b border-gray-50 last:border-0 ${item.selisih !== 0 ? 'bg-orange-50/30' : 'hover:bg-blue-50/50'}`}>
                  <td className="px-3 py-2 text-xs">
                    <p className="font-bold text-xs text-gray-800">{item.product_name}</p>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">
                      {item.stok_sistem}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <input
                      type="number"
                      value={item.stok_fisik === '' ? '' : item.stok_fisik}
                      onChange={(e) => updateStokFisik(item.product_id, e.target.value)}
                      className="w-20 text-center px-1.5 py-0.5 border border-gray-200 rounded focus:ring-1 text-xs font-bold bg-white focus:ring-[#3B82F6] outline-none print:border-none print:bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                        item.selisih > 0
                          ? 'bg-green-100 text-green-700'
                          : item.selisih < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100/50 text-gray-400'
                      }`}
                    >
                      {item.selisih > 0 ? '+' : ''}
                      {item.selisih}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50 print:hidden mt-2">
          <p className="text-[10px] text-gray-500 font-medium">
            Menampilkan {currentItems.length} dari {filteredItems.length} produk
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

        {/* Save Button */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-xs text-gray-500 font-medium">*Hanya item dengan selisih yang akan memengaruhi stok.</p>
          <button
            onClick={handleSave}
            disabled={isSubmitting || itemsWithDiff.length === 0}
            className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-4 py-2 rounded-md text-xs font-bold shadow-sm hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSubmitting ? 'Memproses...' : 'Simpan Opname'}
          </button>
        </div>
      </div>
    </div>
  );
}
