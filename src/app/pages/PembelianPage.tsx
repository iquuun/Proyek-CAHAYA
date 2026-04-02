import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PembelianTab from './PembelianTab';
import DistributorPage from './DistributorPage';
import HutangDistributorPage from './HutangDistributorPage';
import CatatanBelanjaTab from './CatatanBelanjaTab';
import { Package, Users, CreditCard, FileText } from 'lucide-react';

export default function PembelianPage() {
    const [activeTab, setActiveTab] = useState<'pembelian' | 'distributor' | 'hutang' | 'catatan'>('pembelian');
    const { isOwner } = useAuth();

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 inline-flex gap-2">
                <button
                    onClick={() => setActiveTab('pembelian')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === 'pembelian'
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Package size={16} />
                    Data Pembelian
                </button>
                <button
                    onClick={() => setActiveTab('distributor')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === 'distributor'
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Users size={16} />
                    Distributor
                </button>
                <button
                    onClick={() => setActiveTab('catatan')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === 'catatan'
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <FileText size={16} />
                    Catatan Belanja
                </button>
                {isOwner && (
                    <button
                        onClick={() => setActiveTab('hutang')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === 'hutang'
                                ? 'bg-[#3B82F6] text-white'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <CreditCard size={16} />
                        Hutang Distributor
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {activeTab === 'pembelian' && <PembelianTab />}
                {activeTab === 'distributor' && <DistributorPage />}
                {activeTab === 'hutang' && isOwner && <HutangDistributorPage />}
                {activeTab === 'catatan' && <CatatanBelanjaTab />}
            </div>
        </div>
    );
}
