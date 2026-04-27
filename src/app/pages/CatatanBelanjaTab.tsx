import { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle2, Copy, Search, PlusCircle, Plus, Minus, Package, X, Loader2 } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface ParsedLine {
  index: number;
  name: string;
  qty: number;
  isItem: boolean;
  raw: string;
}

export default function CatatanBelanjaTab() {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Product picker states
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Bundling (Paket) states — now inline, no popup
  const [isBundling, setIsBundling] = useState(false);
  const [selectedBundledProducts, setSelectedBundledProducts] = useState<Product[]>([]);
  const [searchBundle, setSearchBundle] = useState('');

  // Qty picker per product in dropdown
  const [dropdownQty, setDropdownQty] = useState<Record<number, number>>({});

  // Create product inline states
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', category_id: '', harga_beli: '', harga_jual: '' });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Load dari Server Settings
  useEffect(() => {
    fetchNoteAndProducts();
  }, []);

  const fetchNoteAndProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data && res.data.catatan_belanja) {
        setNote(res.data.catatan_belanja);
      }
      
      const prodRes = await api.get('/products');
      if (prodRes.data && Array.isArray(prodRes.data)) {
         setProducts(prodRes.data);
      } else if (prodRes.data && Array.isArray(prodRes.data.data)) {
         setProducts(prodRes.data.data);
      }

      const catRes = await api.get('/categories');
      if (catRes.data && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Gagal memuat catatan belanja:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/settings', { catatan_belanja: note });
      setLastSaved(new Date());
      toast.success('Catatan berhasil disimpan ke Database Utama.');
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto save tiap 5 detik jika ada perubahan dan tidak sedang ngetik (didiamkan 3 detik)
  useEffect(() => {
    if (isLoading) return; // Jangan autosave saat loading pertama
    
    const timeoutId = setTimeout(() => {
      // Kita langsung save tapi tanpa ngasih notifikasi biar ga berisik (silent save)
      api.post('/settings', { catatan_belanja: note }).then(() => {
         setLastSaved(new Date());
      }).catch(e => console.error(e));
    }, 5000); // 5 detik setelah berhenti ngetik
    
    return () => clearTimeout(timeoutId);
  }, [note]);

  const handleCopy = () => {
    if (!note.trim()) {
      toast.warning('Catatan masih kosong');
      return;
    }
    navigator.clipboard.writeText(note);
    toast.success('Disalin ke Clipboard! Tinggal Paste di WhatsApp.');
  };

  const handleSortAZ = () => {
    if (!note.trim()) return;
    const parsed = parseLines(note);
    
    // Pisahkan item belanja dengan teks biasa (biar teks manual ditaruh bawah)
    const items = parsed.filter(p => p.isItem).sort((a, b) => a.name.localeCompare(b.name));
    const nonItems = parsed.filter(p => !p.isItem && p.raw.trim() !== '');
    
    const sortedParsed = [...items, ...nonItems];
    setNote(rebuildNote(sortedParsed));
    toast.success('Daftar berhasil diurutkan A-Z!');
  };

  // ----------- PARSE & MANIPULATE NOTE LINES -----------
  const parseLines = (text: string): ParsedLine[] => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const match = line.match(/^(\d+)\.\s*(.+?)\s*-\s*(\d+)\s*pcs.*$/);
      if (match) {
        return { index: i, name: match[2].trim(), qty: parseInt(match[3]), isItem: true, raw: line };
      }
      return { index: i, name: '', qty: 0, isItem: false, raw: line };
    });
  };

  const rebuildNote = (parsed: ParsedLine[]): string => {
    let counter = 1;
    return parsed.map(p => {
      if (p.isItem) {
        return `${counter++}. ${p.name} - ${p.qty} pcs`;
      }
      return p.raw;
    }).join('\n');
  };

  const changeQty = (lineIndex: number, delta: number) => {
    const parsed = parseLines(note);
    const target = parsed[lineIndex];
    if (!target || !target.isItem) return;
    
    const newQty = target.qty + delta;
    if (newQty <= 0) {
      // Remove line
      parsed.splice(lineIndex, 1);
    } else {
      target.qty = newQty;
    }
    setNote(rebuildNote(parsed));
  };

  const appendToNote = (productName: string, qty: number = 1) => {
    const parsed = parseLines(note).filter(p => p.isItem || p.raw.trim() !== '');
    
    let found = false;
    for (const p of parsed) {
      if (p.isItem && p.name === productName) {
        p.qty += qty;
        found = true;
        break;
      }
    }

    if (!found) {
      parsed.push({ index: parsed.length, name: productName, qty, isItem: true, raw: '' });
    }

    setNote(rebuildNote(parsed));
  };

  const handleAddFromDropdown = (product: Product) => {
    const qty = dropdownQty[product.id] || 1;
    appendToNote(product.name, qty);
    // Reset qty for this product
    setDropdownQty(prev => ({ ...prev, [product.id]: 1 }));
  };

  const createBundle = () => {
    if (selectedBundledProducts.length === 0) return;
    
    const bundleName = selectedBundledProducts.map(p => p.name).join(' + ');
    const bundleStr = `PAKET ${bundleName}`;
    
    appendToNote(bundleStr, 1);
    
    setSelectedBundledProducts([]);
    setIsBundling(false);
    setSearchBundle('');
  };

  // ----------- CREATE PRODUCT -----------
  const handleCreateProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.category_id) {
      toast.warning('Nama dan Kategori wajib diisi');
      return;
    }
    setIsCreatingProduct(true);
    try {
      const payload = {
        name: newProduct.name.trim(),
        category_id: parseInt(newProduct.category_id),
        harga_beli: parseFloat(newProduct.harga_beli) || 0,
        harga_jual: parseFloat(newProduct.harga_jual) || 0,
        stok_saat_ini: 0,
      };
      await api.post('/products', payload);
      toast.success(`Produk "${newProduct.name}" berhasil dibuat!`);
      
      // Refresh products list
      const prodRes = await api.get('/products');
      if (prodRes.data && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
      } else if (prodRes.data && Array.isArray(prodRes.data.data)) {
        setProducts(prodRes.data.data);
      }

      // Langsung tambah ke catatan
      appendToNote(newProduct.name.trim(), 1);
      
      setNewProduct({ name: '', category_id: '', harga_beli: '', harga_jual: '' });
      setShowCreateProduct(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat produk');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);
  const filteredBundleProducts = products
    .filter(p => p.name.toLowerCase().includes(searchBundle.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);

  // Parse current note for the interactive list
  const parsedNoteLines = parseLines(note);
  const hasItems = parsedNoteLines.some(p => p.isItem);

  return (
    <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      {/* HEADER */}
      <div className="bg-muted p-4 flex justify-between items-center border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <FileText className="text-primary" size={20} />
            Catatan Belanja & Permintaan
          </h2>
          <p className="text-xs text-muted-foreground mt-1 hidden md:block">
            Terhubung langsung ke server database, semua komputer bisa saling melengkapi daftar.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button 
              onClick={handleSortAZ}
              className="bg-accent text-foreground hover:bg-muted px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border border-border transition active:scale-95"
            >
              Sortir A-Z
            </button>
            <button 
              onClick={handleCopy}
              className="bg-accent text-foreground hover:bg-muted px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border border-border transition active:scale-95"
            >
              <Copy size={14} /> Salin Teks
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : (
                <>
                  <Save size={14} /> Simpan
                </>
              )}
            </button>
          </div>
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
               <CheckCircle2 size={10} className="text-green-500" /> Tersimpan jam {lastSaved.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
      </div>

      {/* TOOLBAR: Search + Buat Paket + Buat Produk */}
      <div className="bg-card border-b border-border p-3 flex flex-wrap items-center gap-2 relative z-10 shrink-0">
         {/* Search product */}
         <div className="relative flex-1 min-w-[200px]">
             <div 
               className="flex items-center bg-input/20 border border-border rounded-lg p-1.5 focus-within:ring-2 ring-primary focus-within:bg-card transition-all cursor-text text-foreground"
               onClick={() => setShowProductDropdown(true)}
             >
               <Search size={16} className="text-muted-foreground ml-2 mr-2" />
               <input 
                 value={searchProduct}
                 onChange={e => { setSearchProduct(e.target.value); setShowProductDropdown(true); }}
                 onFocus={() => setShowProductDropdown(true)}
                 placeholder="Cari & klik nama stok barang..."
                 className="bg-transparent outline-none text-sm w-full font-medium"
               />
             </div>
             
             {showProductDropdown && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => { setShowProductDropdown(false); setDropdownQty({}); }}></div>
                 <div className="absolute top-full mt-2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                   {filteredProducts.length === 0 ? (
                       <div className="p-4 text-center text-sm text-muted-foreground">Opps.. Barang tidak ditemukan.</div>
                   ) : (
                       <div className="p-1">
                         {filteredProducts.map(p => {
                           const qty = dropdownQty[p.id] || 1;
                           return (
                             <div 
                               key={p.id} 
                               className="flex items-center justify-between px-3 py-2 rounded hover:bg-accent group border-b border-border last:border-b-0 gap-2"
                             >
                               <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex-1 truncate">{p.name}</span>
                               <div className="flex items-center gap-1 shrink-0">
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setDropdownQty(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) })); }}
                                   className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-600 transition-colors active:scale-90"
                                 >
                                   <Minus size={11} />
                                 </button>
                                 <span className="text-xs font-black w-6 text-center">{qty}</span>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setDropdownQty(prev => ({ ...prev, [p.id]: (prev[p.id] || 1) + 1 })); }}
                                   className="w-6 h-6 flex items-center justify-center rounded bg-green-100 hover:bg-green-200 text-green-600 transition-colors active:scale-90"
                                 >
                                   <Plus size={11} />
                                 </button>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); handleAddFromDropdown(p); }}
                                   className="ml-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
                                 >
                                   Tambah
                                 </button>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                   )}
                 </div>
               </>
             )}
         </div>

         {/* Toggle Buat Paket */}
         <button 
           onClick={() => { setIsBundling(!isBundling); setShowCreateProduct(false); }}
           className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 shadow-sm ${
             isBundling 
               ? 'bg-blue-500 text-white border-blue-500' 
               : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-200'
           }`}
         >
           <Package size={14} /> {isBundling ? 'Tutup Paket' : 'Buat Paket'}
         </button>

         {/* Toggle Buat Produk */}
         <button 
           onClick={() => { setShowCreateProduct(!showCreateProduct); setIsBundling(false); }}
           className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 shadow-sm ${
             showCreateProduct
               ? 'bg-emerald-500 text-white border-emerald-500'
               : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-200'
           }`}
         >
           <PlusCircle size={14} /> {showCreateProduct ? 'Tutup' : 'Buat Produk'}
         </button>
      </div>

      {/* INLINE: BUAT PAKET — compact single row */}
      {isBundling && (
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900 p-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Label */}
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider shrink-0">📦 Paket:</span>

            {/* Selected chips */}
            {selectedBundledProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-0.5">
                {i > 0 && <span className="text-blue-400 font-bold text-[10px]">+</span>}
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-bold">
                  {p.name}
                  <button onClick={() => setSelectedBundledProducts(prev => prev.filter(x => x.id !== p.id))} className="text-blue-400 hover:text-red-500 ml-0.5">&times;</button>
                </span>
              </div>
            ))}

            {/* Search with dropdown */}
            <div className="relative flex-1 min-w-[150px]">
              <input 
                placeholder="Cari & klik untuk paketkan..."
                value={searchBundle}
                onChange={e => setSearchBundle(e.target.value)}
                onFocus={() => setSearchBundle(searchBundle)}
                className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs outline-none focus:ring-2 ring-blue-300/50 font-medium"
              />
              {searchBundle.trim() && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSearchBundle('')}></div>
                  <div className="absolute top-full mt-1 w-full max-w-md bg-card border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredBundleProducts.map(p => {
                      const isSelected = selectedBundledProducts.some(x => x.id === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!isSelected) setSelectedBundledProducts(prev => [...prev, p]);
                            else setSelectedBundledProducts(prev => prev.filter(x => x.id !== p.id));
                            setSearchBundle('');
                          }}
                          className={`px-3 py-2 text-xs font-bold cursor-pointer border-b border-border last:border-0 flex items-center justify-between ${
                            isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-accent text-foreground'
                          }`}
                        >
                          {p.name}
                          {isSelected ? <CheckCircle2 size={12} /> : <PlusCircle size={12} className="opacity-40" />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Submit */}
            <button
              disabled={selectedBundledProducts.length === 0}
              onClick={createBundle}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[11px] font-bold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 shrink-0"
            >
              + Tambah
            </button>
          </div>
        </div>
      )}

      {/* INLINE: BUAT PRODUK BARU */}
      {showCreateProduct && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900 p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <PlusCircle size={14} /> Buat Produk Baru & Langsung Tambah ke Catatan
            </h3>
            <button onClick={() => setShowCreateProduct(false)} className="text-muted-foreground hover:text-foreground p-0.5">&times;</button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nama Produk *</label>
              <input 
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="Contoh: SSD NVMe 512GB"
                className="w-full px-2.5 py-2 bg-card border border-border rounded-lg text-xs outline-none focus:ring-2 ring-primary/20 font-medium"
              />
            </div>
            <div className="w-36">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Kategori *</label>
              <select
                value={newProduct.category_id}
                onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}
                className="w-full px-2.5 py-2 bg-card border border-border rounded-lg text-xs outline-none focus:ring-2 ring-primary/20 font-medium"
              >
                <option value="">Pilih...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Harga Beli</label>
              <input 
                type="number"
                value={newProduct.harga_beli}
                onChange={e => setNewProduct({...newProduct, harga_beli: e.target.value})}
                placeholder="0"
                className="w-full px-2.5 py-2 bg-card border border-border rounded-lg text-xs outline-none focus:ring-2 ring-primary/20 font-medium"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Harga Jual</label>
              <input 
                type="number"
                value={newProduct.harga_jual}
                onChange={e => setNewProduct({...newProduct, harga_jual: e.target.value})}
                placeholder="0"
                className="w-full px-2.5 py-2 bg-card border border-border rounded-lg text-xs outline-none focus:ring-2 ring-primary/20 font-medium"
              />
            </div>
            <button
              onClick={handleCreateProduct}
              disabled={isCreatingProduct || !newProduct.name.trim() || !newProduct.category_id}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 shrink-0 flex items-center gap-1.5"
            >
              {isCreatingProduct ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              {isCreatingProduct ? 'Membuat...' : 'Buat & Tambah'}
            </button>
          </div>
        </div>
      )}



      {/* TEXT AREA */}
      <div className="p-4 flex-1 flex flex-col bg-sidebar-primary/5 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Memuat catatan...</div>
        ) : (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan daftar belajaan, permintaan khusus pelanggan, atau barang yang butuh digaransikan secepatnya ke distributor disini..."
            className="w-full flex-1 p-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground text-sm font-medium leading-relaxed custom-scrollbar shadow-inner"
            style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}
          ></textarea>
        )}
      </div>
    </div>
  );
}
