import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      let errorMsg = 'Gagal untuk masuk, silakan coba lagi.';
      const serverMsg = err.response?.data?.message || '';
      
      // Sembunyikan pesan error SQL/Database dari user
      if (serverMsg.includes('SQLSTATE') || serverMsg.includes('Connection') || !err.response) {
        errorMsg = 'Gagal terhubung ke server. Silakan pastikan server database aktif dan coba lagi.';
      } else if (err.response?.status === 401 || err.response?.status === 404 || serverMsg.toLowerCase().includes('password') || serverMsg.toLowerCase().includes('email')) {
        errorMsg = 'Email atau password yang Anda masukkan salah!';
      } else {
        errorMsg = 'Kombinasi email dan password tidak ditemukan.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center p-3 font-['Inter']">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-12 bg-[#3B82F6] rounded-full mb-3">
            <LogIn className="text-white" size={16} />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">CAHAYA KOMPUTER</h1>
          <p className="text-gray-600 mt-2">Sistem Kasir & Manajemen Toko</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
              placeholder="email@cahaya.id"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium text-gray-700">Password</label>
              <a 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  alert('Fitur reset password belum diaktifkan. Silakan hubungi Administrator atau Owner toko untuk mereset password Anda.'); 
                }} 
                className="text-xs text-[#3B82F6] font-medium hover:underline"
              >
                Lupa password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] text-white py-2 rounded-lg font-medium hover:bg-[#2563EB] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-4 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center mb-3">Demo Akun:</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Owner:</span>
              <span className="font-medium">owner@cahaya.id</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Staf:</span>
              <span className="font-medium">staf@cahaya.id</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
