import { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle2, Copy, Search, PlusCircle } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
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

  const appendToNote = (productName: string) => {
    const lines = note.split('\n').filter(l => l.trim() !== '');
    const nextNum = lines.length + 1;
    const formattedLine = `${nextNum}. ${productName} - 1 pcs`;

    const newNote = note.trim() === '' 
      ? formattedLine 
      : `${note.trim()}\n${formattedLine}`;
    
    setNote(newNote);
    setShowProductDropdown(false);
    setSearchProduct('');
    // textarea gets the value, user can type the QTY themselves at the end
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase())).slice(0, 50);

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

      {/* QUICK PRODUCT PICKER BAR */}
      <div className="bg-card border-b border-border p-3 flex items-center gap-3 relative z-10 shrink-0">
         <span className="text-xs font-bold whitespace-nowrap hidden sm:block">Sisipkan Dari Gudang:</span>
         <div className="relative w-full max-w-md">
            <div 
              className="flex items-center bg-input/20 border border-border rounded-lg p-1.5 focus-within:ring-2 ring-primary focus-within:bg-card transition-all cursor-text text-foreground"
              onClick={() => setShowProductDropdown(true)}
            >
              <Search size={16} className="text-muted-foreground ml-2 mr-2" />
              <input 
                value={searchProduct}
                onChange={e => { setSearchProduct(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Cari & klik nama stok barang untuk ditambah ke catatan..."
                className="bg-transparent outline-none text-sm w-full font-medium"
              />
            </div>
            
            {showProductDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProductDropdown(false)}></div>
                <div className="absolute top-full mt-2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                   {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Opps.. Barang tidak ditemukan.</div>
                   ) : (
                      <div className="p-1">
                        {filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => appendToNote(p.name)}
                            className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-accent cursor-pointer group border-b border-border last:border-b-0"
                          >
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                            <PlusCircle size={14} className="text-muted-foreground group-hover:text-primary" />
                          </div>
                        ))}
                      </div>
                   )}
                </div>
              </>
            )}
         </div>
      </div>

      {/* TEXT AREA */}
      <div className="p-4 flex-1 flex flex-col bg-sidebar-primary/5">
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
