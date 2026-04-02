import { useLocation } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useThemeContext, Theme, FontSize, FontFamily } from '../context/ThemeContext';
import { Moon, Sun, Type, MonitorSmartphone, Monitor, Laptop } from 'lucide-react';

const pathNames: Record<string, string> = {
  '/': 'Dashboard',
  '/penjualan': 'Penjualan',
  '/pembelian': 'Pembelian',
  '/produk': 'Produk',
  '/stok-opname': 'Stok Opname',
  '/garansi': 'Garansi',
  '/kalkulator': 'Kalkulator Rakitan',
  '/cash-flow': 'Cash Flow',
  '/nilai-aset': 'Nilai Aset',
  '/pengaturan': 'Pengaturan Toko',
  '/users': 'Manajemen Akun',
};

export default function Topbar() {
  const location = useLocation();
  const pageName = pathNames[location.pathname] || 'Sistem Kasir';
  const { theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily } = useThemeContext();
  const [openSettings, setOpenSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setOpenSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="bg-card border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0 transition-colors duration-200">
      <h2 className="text-sm font-bold text-foreground tracking-tight">{pageName}</h2>
      <div className="flex items-center gap-4">
        
        {/* Date Display */}
        <div className="hidden sm:block text-xs font-medium text-muted-foreground mr-2">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>

        {/* Global Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button 
            onClick={() => setOpenSettings(!openSettings)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-foreground hover:bg-muted transition-colors border border-border"
            title="Pengaturan Tampilan"
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {openSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Preferensi Tampilan</h3>
              
              <div className="space-y-4">
                {/* Theme Setting */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5"><Sun size={13}/> Tema Gelap / Terang</p>
                  <div className="flex p-1 bg-accent rounded-lg border border-border/50">
                    <button 
                      onClick={() => setTheme('light')} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${theme === 'light' ? 'bg-card text-foreground shadow font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Terang
                    </button>
                    <button 
                      onClick={() => setTheme('dark')} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${theme === 'dark' ? 'bg-card text-foreground shadow font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Gelap
                    </button>
                  </div>
                </div>

                {/* Font Size Setting */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5"><Monitor size={13}/> Skala Ukuran Teks (Zoom)</p>
                  <div className="flex p-1 bg-accent rounded-lg border border-border/50">
                    <button 
                      onClick={() => setFontSize('kecil')} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${fontSize === 'kecil' ? 'bg-card text-foreground shadow font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Kecil
                    </button>
                    <button 
                      onClick={() => setFontSize('sedang')} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${fontSize === 'sedang' ? 'bg-card text-foreground shadow font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Normal
                    </button>
                    <button 
                      onClick={() => setFontSize('besar')} 
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${fontSize === 'besar' ? 'bg-card text-foreground shadow font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Besar
                    </button>
                  </div>
                </div>

                {/* Font Family Setting */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5"><Type size={13}/> Gaya Huruf Dasar</p>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => setFontFamily('inter')} 
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all ${fontFamily === 'inter' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-foreground hover:bg-accent border border-transparent'}`}
                    >
                      Inter / Tailwind Default
                    </button>
                    <button 
                      onClick={() => setFontFamily('roboto')} 
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all ${fontFamily === 'roboto' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-foreground hover:bg-accent border border-transparent'} font-roboto`}
                    >
                      Roboto (Classic Android)
                    </button>
                    <button 
                      onClick={() => setFontFamily('system')} 
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all ${fontFamily === 'system' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-foreground hover:bg-accent border border-transparent'} font-sans`}
                    >
                      System / San Francisco
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
