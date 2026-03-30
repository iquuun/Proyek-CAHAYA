import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { Package, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api';

interface AsetKategori {
  kategori: string;
  total_stok: number;
  nilai_aset: number;
  persentase: number;
}

interface NilaiAsetData {
  total_nilai_aset: number;
  total_stok_keseluruhan: number;
  total_kategori_aktif: number;
  data_kategori: AsetKategori[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#F43F5E', '#A855F7'];

export default function NilaiAsetPage() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<NilaiAsetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNilaiAset = async () => {
      setLoading(true);
      try {
        const res = await api.get('/nilai-aset');
        setData(res.data);
      } catch (error) {
        console.error("Gagal memuat data nilai aset", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOwner) fetchNilaiAset();
  }, [isOwner]);

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Memuat analisis aset...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-800 tracking-tight">Nilai Aset</h2>
        <p className="text-xs text-gray-500 mt-0.5">Total nilai investasi stok barang berdasarkan Harga Modal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={16} />
            <p className="text-xs font-medium">Total Nilai Aset</p>
          </div>
          <p className="text-2xl font-bold">Rp {data.total_nilai_aset.toLocaleString('id-ID')}</p>
          <p className="text-xs text-white/80 mt-2">Nilai investasi total</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="text-green-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Total Unit Stok</p>
          </div>
          <p className="text-2xl font-semibold text-gray-800">{data.total_stok_keseluruhan}</p>
          <p className="text-xs text-gray-500 mt-2">Item tersedia dalam inventory</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Kategori Aktif</p>
          </div>
          <p className="text-2xl font-semibold text-gray-800">{data.total_kategori_aktif}</p>
          <p className="text-xs text-gray-500 mt-2">Jenis kategori yang ada isinya</p>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-base font-medium text-gray-800 mb-3">Distribusi Nilai Aset</h3>
          {data.data_kategori.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Data aset tidak tersedia.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.data_kategori}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="nilai_aset"
                  nameKey="kategori"
                  stroke="none"
                >
                  {data.data_kategori.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [`Rp ${value.toLocaleString('id-ID')} (${props.payload.persentase}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-base font-medium text-gray-800 mb-3">Nilai Aset Per Kategori</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {data.data_kategori.length === 0 ? (
              <p className="text-gray-500 text-xs">Tidak ada barang</p>
            ) : (
              data.data_kategori
                .map((item, index) => (
                  <div
                    key={item.kategori}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium text-gray-800">{item.kategori}</span>
                      </div>
                      <span className="text-xs text-gray-600">{item.total_stok} unit</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-[#3B82F6]">
                        Rp {item.nilai_aset.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-gray-500">{item.persentase}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${item.persentase}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-800">Detail Nilai Aset</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Kategori</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total Stok</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Nilai Aset</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data_kategori.map((item, index) => (
                <tr key={item.kategori} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="font-medium text-gray-800">{item.kategori}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{item.total_stok} unit</td>
                  <td className="px-4 py-3 text-right font-medium text-[#3B82F6]">
                    Rp {item.nilai_aset.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
                      {item.persentase}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.data_kategori.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-gray-500">
                    Tidak ada data aset untuk ditampilkan.
                  </td>
                </tr>
              )}
              {data.data_kategori.length > 0 && (
                <tr className="bg-[#3B82F6]/10 font-semibold">
                  <td className="px-4 py-3 text-gray-800">TOTAL KESELURUHAN</td>
                  <td className="px-4 py-3 text-center text-gray-800">{data.total_stok_keseluruhan} unit</td>
                  <td className="px-4 py-3 text-right text-[#3B82F6] text-base">
                    Rp {data.total_nilai_aset.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-800">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
