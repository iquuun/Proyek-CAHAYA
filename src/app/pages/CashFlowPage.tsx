import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import LaporanLabaPage from './LaporanLabaPage';
import MutasiRekeningTab from './MutasiRekeningTab';
import PembukuanPenjualanTab from './PembukuanPenjualanTab';
import EmployeeSalaryTab from './EmployeeSalaryTab';
import { TrendingUp, LayoutList, Wallet, UserCircle } from 'lucide-react';

export default function CashFlowPage() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'laba_rugi' | 'pembukuan' | 'mutasi' | 'gaji'>('laba_rugi');

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="sticky top-0 z-40 bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1 w-fit">
        <button
          onClick={() => setActiveTab('laba_rugi')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'laba_rugi'
              ? 'bg-[#3B82F6] text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <TrendingUp size={16} />
          Laporan Keuangan Toko
        </button>
        <button
          onClick={() => setActiveTab('pembukuan')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pembukuan'
              ? 'bg-[#3B82F6] text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <LayoutList size={16} />
          Pembukuan Penjualan
        </button>
        <button
          onClick={() => setActiveTab('mutasi')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'mutasi'
              ? 'bg-[#3B82F6] text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Wallet size={16} />
          Mutasi Rekening Cash
        </button>
        <button
          onClick={() => setActiveTab('gaji')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'gaji'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <UserCircle size={16} />
          Gaji Karyawan
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'laba_rugi' && <LaporanLabaPage isEmbedded />}
        {activeTab === 'pembukuan' && <PembukuanPenjualanTab />}
        {activeTab === 'mutasi' && <MutasiRekeningTab />}
        {activeTab === 'gaji' && <EmployeeSalaryTab />}
      </div>
    </div>
  );
}

