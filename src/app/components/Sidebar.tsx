import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Box,
  Users,
  ClipboardList,
  Wrench,
  Calculator,
  DollarSign,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  X
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/penjualan', label: 'Penjualan', icon: ShoppingCart },
  { path: '/pembelian', label: 'Pembelian', icon: Package },
  { path: '/produk', label: 'Produk', icon: Box },
  { path: '/stok-opname', label: 'Stok Opname', icon: ClipboardList },
  { path: '/garansi', label: 'Garansi', icon: Wrench },
  { path: '/kalkulator', label: 'Kalkulator Rakitan', icon: Calculator },
  { path: '/cash-flow', label: 'Cash Flow', icon: DollarSign, ownerOnly: true },
  { path: '/nilai-aset', label: 'Nilai Aset', icon: Wallet, ownerOnly: true },
  { path: '/pengaturan', label: 'Pengaturan Toko', icon: Settings, ownerOnly: true },
  { path: '/users', label: 'Manajemen Akun', icon: Users, ownerOnly: true },
];

export default function Sidebar() {
  const { isOwner, logout, user } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className={`p-4 border-b border-white/10 shrink-0 flex items-center ${(isCollapsed && !isMobile) ? 'justify-center' : 'justify-between'}`}>
        {(!isCollapsed || isMobile) && (
          <div className="overflow-hidden">
            <h1 className="text-sm xs:text-base font-black truncate text-sidebar-foreground">CAHAYA KOMPUTER</h1>
            <p className="text-xs text-sidebar-foreground/80 mt-0.5 truncate">{user?.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 truncate">{user?.role}</p>
          </div>
        )}
        {isMobile ? (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white shrink-0"
          >
            <X size={22} />
          </button>
        ) : (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-sidebar-foreground/20 rounded transition-colors text-sidebar-foreground shrink-0"
            title={isCollapsed ? "Perbesar Menu" : "Perkecil Menu"}
          >
            {isCollapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex flex-col">
        {navItems.map((item) => {
          if (item.ownerOnly && !isOwner) return null;

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md mb-0.5 transition-all text-xs w-full ${isActive
                  ? 'bg-sidebar-foreground text-sidebar font-bold shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 font-medium'
                } ${(isCollapsed && !isMobile) ? 'justify-center gap-0' : 'gap-2.5'}`
              }
              title={(isCollapsed && !isMobile) ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={`flex items-center px-3 py-2 rounded-md w-full text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 transition-all text-xs font-medium ${(isCollapsed && !isMobile) ? 'justify-center gap-0' : 'gap-2.5'}`}
          title={(isCollapsed && !isMobile) ? "Keluar" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Keluar</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex bg-sidebar text-sidebar-foreground flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-sidebar-border print:hidden ${isCollapsed ? 'w-20' : 'w-56'}`}>
        {sidebarContent(false)}
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-300 ease-in-out border-r border-sidebar-border print:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent(true)}
      </div>

      {/* Mobile Bottom Bar (Hamburger Trigger) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg print:hidden">
        <div className="flex items-center justify-around py-1.5">
          <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${isActive ? 'text-[#3B82F6]' : 'text-gray-400'}`}>
            <LayoutDashboard size={18} />
            <span className="text-[9px] font-medium">Home</span>
          </NavLink>
          <NavLink to="/penjualan" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${isActive ? 'text-[#3B82F6]' : 'text-gray-400'}`}>
            <ShoppingCart size={18} />
            <span className="text-[9px] font-medium">Kasir</span>
          </NavLink>
          <NavLink to="/produk" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${isActive ? 'text-[#3B82F6]' : 'text-gray-400'}`}>
            <Box size={18} />
            <span className="text-[9px] font-medium">Produk</span>
          </NavLink>
          <NavLink to="/garansi" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${isActive ? 'text-[#3B82F6]' : 'text-gray-400'}`}>
            <Wrench size={18} />
            <span className="text-[9px] font-medium">Garansi</span>
          </NavLink>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-gray-400"
          >
            <Menu size={18} />
            <span className="text-[9px] font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center text-black">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <LogOut className="text-red-500 w-8 h-8 ml-1" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Keluar</h3>
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses data toko.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 text-black">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
