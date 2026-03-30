import { useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Box,
  Folder,
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
  ChevronLeft
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

  return (
    <div className={`bg-[#3B82F6] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out print:hidden ${isCollapsed ? 'w-20' : 'w-56'}`}>
      <div className={`p-4 border-b border-white/10 shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-wide whitespace-nowrap">CAHAYA KOMPUTER</h1>
            <p className="text-xs text-white/80 mt-0.5 whitespace-nowrap">{user?.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/50 whitespace-nowrap">{user?.role}</p>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-white/20 rounded transition-colors text-white shrink-0"
          title={isCollapsed ? "Perbesar Menu" : "Perkecil Menu"}
        >
          {isCollapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
        </button>
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
                  ? 'bg-white text-[#3B82F6] font-bold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 font-medium'
                } ${isCollapsed ? 'justify-center gap-0' : 'gap-2.5'}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={`flex items-center px-3 py-2 rounded-md w-full text-white/80 hover:bg-white/10 transition-all text-xs font-medium ${isCollapsed ? 'justify-center gap-0' : 'gap-2.5'}`}
          title={isCollapsed ? "Keluar" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span className="truncate">Keluar</span>}
        </button>
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
    </div>
  );
}
