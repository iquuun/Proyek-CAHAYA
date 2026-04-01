import { useLocation } from 'react-router';

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

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between shrink-0">
      <h2 className="text-sm font-bold text-gray-800 tracking-tight">{pageName}</h2>
      <div className="flex items-center gap-4">
        <div className="text-xs font-medium text-gray-500">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}
