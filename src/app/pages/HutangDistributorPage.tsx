import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { CreditCard, DollarSign } from 'lucide-react';
import api from '../api';

interface Purchase {
  id: number;
  invoice: string;
  distributor_id: number;
  tanggal: string;
  total_pembelian: number;
  terbayar: number;
  status_pembayaran: 'lunas' | 'hutang';
  distributor?: {
    id: number;
    name: string;
  };
}

export default function HutangDistributorPage() {
  const { isOwner } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOwner) {
      fetchPurchases();
    }
  }, [isOwner]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchases');
      setPurchases(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data hutang');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div><div className="h-5 bg-gray-200 rounded w-48 mb-2" /><div className="h-3 bg-gray-200 rounded w-64" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => (<div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><div className="h-3 bg-gray-200 rounded w-20 mb-2" /><div className="h-6 bg-gray-200 rounded w-28" /></div>))}</div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  const hutangList = purchases.filter(p => p.status_pembayaran === 'hutang' || Number(p.total_pembelian) > Number(p.terbayar));

  const totalHutang = hutangList.reduce((sum, h) => sum + Number(h.total_pembelian), 0);
  const totalTerbayar = hutangList.reduce((sum, h) => sum + Number(h.terbayar), 0);
  const totalSisa = hutangList.reduce((sum, h) => sum + (Number(h.total_pembelian) - Number(h.terbayar)), 0);
  const hutangAktif = hutangList;

  // Group by distributor
  const hutangPerDistributor = hutangList.reduce((acc, hutang) => {
    const distributorName = hutang.distributor?.name || 'Unknown';
    if (!acc[distributorName]) {
      acc[distributorName] = 0;
    }
    acc[distributorName] += (Number(hutang.total_pembelian) - Number(hutang.terbayar));
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Hutang Distributor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola hutang pembelian dari distributor</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Hutang</p>
          <p className="text-xl font-bold text-[#3B82F6]">
            Rp {totalHutang.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Terbayar</p>
          <p className="text-xl font-bold text-green-600">
            Rp {totalTerbayar.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Sisa Hutang</p>
          <p className="text-xl font-bold text-red-600">
            Rp {totalSisa.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Hutang Aktif</p>
          <p className="text-xl font-bold text-gray-800">{hutangAktif.length}</p>
          <p className="text-[10px] text-gray-400 font-medium">Pembelian Belum Lunas</p>
        </div>
      </div>

      {/* Hutang Per Distributor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Hutang Per Distributor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(hutangPerDistributor)
            .filter(([_, sisa]) => sisa > 0)
            .map(([distributor, sisa]) => (
              <div key={distributor} className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <p className="font-medium text-xs text-gray-800 mb-0.5">{distributor}</p>
                <p className="text-base font-bold text-red-600">
                  Rp {sisa.toLocaleString('id-ID')}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Detail Hutang</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Invoice</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Distributor</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tanggal</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Terbayar</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Sisa</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hutangAktif.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-gray-500">
                    Tidak ada hutang aktif saat ini.
                  </td>
                </tr>
              ) : (
                hutangAktif.map((hutang) => {
                  const total = Number(hutang.total_pembelian);
                  const terbayar = Number(hutang.terbayar);
                  const sisa = total - terbayar;
                  const persentaseBayar = (terbayar / total) * 100;

                  return (
                    <tr key={hutang.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 text-xs">
                        <p className="font-bold text-gray-800">{hutang.invoice || '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{hutang.distributor?.name || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {new Date(hutang.tanggal).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-800">
                        Rp {total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-green-600">
                        Rp {terbayar.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-xs text-right">
                        <span className="font-medium text-red-600">
                          Rp {sisa.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 mb-1">
                            Belum Lunas
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(persentaseBayar, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] text-gray-500 mt-1">
                            {persentaseBayar.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
