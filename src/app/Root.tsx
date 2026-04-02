import { Outlet, Navigate, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

export default function Root() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-background text-foreground antialiased selection:bg-primary/20 transition-colors duration-200">
        <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-3 md:p-6 pb-20 md:pb-6 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      </div>
      <Toaster position="top-right" richColors expand={true} theme="system" />
    </ThemeProvider>
  );
}
