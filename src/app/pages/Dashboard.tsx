import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

interface DashboardData {
  stats: {
    total_penjualan: number;
    laba_kotor: number;
    saldo_kas: number;
    hutang_distributor: number;
    nilai_aset: number;
    total_transaksi: number;
  };
  chart_data: { name: string; value: number }[];
  recent_transactions: { id: string; customer: string; total: number; time: string }[];
  low_stock: { id: number; name: string; stok: number; min: number }[];
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-lg hover:shadow-[#3B82F6]/5 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3B82F6] to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{title}</p>
          <p className="text-xl font-bold tracking-tight text-gray-800 mb-1 group-hover:text-[#3B82F6] transition-colors">{value}</p>
          <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-[#3B82F6] group-hover:rotate-3 transition-all duration-300 shadow-sm">
          <Icon className="text-[#3B82F6] group-hover:text-white transition-colors" size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (error) {
        console.error("Gagal memuat dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-[220px] bg-gray-100 rounded-lg" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                  <div className="space-y-1.5">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                    <div className="h-3 bg-gray-200 rounded w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Total Penjualan"
          value={`Rp ${(data.stats.total_penjualan / 1000000).toFixed(1)} Jt`}
          subtitle="Minggu ini"
          icon={ShoppingCart}
        />
        {isOwner && (
          <StatCard
            title="Laba Kotor"
            value={`Rp ${(data.stats.laba_kotor / 1000000).toFixed(1)} Jt`}
            subtitle="Minggu ini"
            icon={TrendingUp}
          />
        )}
        {isOwner && (
          <StatCard
            title="Saldo Kas"
            value={`Rp ${(data.stats.saldo_kas / 1000000).toFixed(1)} Jt`}
            subtitle="Saldo saat ini"
            icon={Wallet}
          />
        )}
        {isOwner && (
          <StatCard
            title="Hutang Distributor"
            value={`Rp ${(data.stats.hutang_distributor / 1000000).toFixed(1)} Jt`}
            subtitle="Belum dibayar"
            icon={CreditCard}
          />
        )}
        {isOwner && (
          <StatCard
            title="Nilai Aset"
            value={`Rp ${(data.stats.nilai_aset / 1000000).toFixed(1)} Jt`}
            subtitle="Total nilai stok"
            icon={Package}
          />
        )}
        <StatCard
          title="Total Transaksi"
          value={data.stats.total_transaksi.toLocaleString('id-ID')}
          subtitle="Bulan ini"
          icon={DollarSign}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Grafik Penjualan 7 Hari Terakhir</h3>
          <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart_data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(v) => `Rp${v / 1000000}Jt`} width={80} />
              <Tooltip
                formatter={(value: number) => [
                  `Rp ${value.toLocaleString('id-ID')}`,
                  'Penjualan',
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Transaksi Terbaru</h3>
          </div>
          {data.recent_transactions.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-3">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1">
              {data.recent_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100 transition-all duration-300 group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-gray-800 text-sm group-hover:text-[#3B82F6] transition-colors">{transaction.id}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{transaction.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#3B82F6]">
                      Rp {transaction.total.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{transaction.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
