import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { Wallet, FileText, LayoutList } from 'lucide-react';
import MutasiRekeningTab from './MutasiRekeningTab';
import PembukuanPenjualanTab from './PembukuanPenjualanTab';
import LaporanLabaPage from './LaporanLabaPage';

export default function CashFlowPage() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'laba_rugi' | 'pembukuan' | 'mutasi'>('laba_rugi');

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('laba_rugi')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'laba_rugi'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUpIcon size={16} />
          Laporan Laba Rugi
        </button>
        <button
          onClick={() => setActiveTab('pembukuan')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'pembukuan'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LayoutList size={16} />
          Pembukuan Penjualan
        </button>
        <button
          onClick={() => setActiveTab('mutasi')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'mutasi'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Wallet size={16} />
          Mutasi Rekening Cash
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'laba_rugi' && <LaporanLabaPage isEmbedded />}
        {activeTab === 'pembukuan' && <PembukuanPenjualanTab />}
        {activeTab === 'mutasi' && <MutasiRekeningTab />}
      </div>
    </div>
  );
}

// Inline icon
function TrendingUpIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  );
}
