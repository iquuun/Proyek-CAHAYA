import { createBrowserRouter } from "react-router";
import Root from "./Root";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import PenjualanPage from "./pages/PenjualanPage";
import PembelianPage from "./pages/PembelianPage";
import ProdukPage from "./pages/ProdukPage";
import KategoriPage from "./pages/KategoriTab"; // I renamed the file so I need to check routes.ts imports
import StokOpnamePage from "./pages/StokOpnamePage";
import GaransiPage from "./pages/GaransiPage";
import KalkulatorRakitanPage from "./pages/KalkulatorRakitanPage";
import CashFlowPage from "./pages/CashFlowPage";
import LaporanLabaPage from "./pages/LaporanLabaPage";
import NilaiAsetPage from "./pages/NilaiAsetPage";
import PengaturanPage from "./pages/PengaturanPage";
import UsersPage from "./pages/UsersPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "penjualan", Component: PenjualanPage },
      { path: "pembelian", Component: PembelianPage },
      { path: "produk", Component: ProdukPage },
      { path: "stok-opname", Component: StokOpnamePage },
      { path: "garansi", Component: GaransiPage },
      { path: "kalkulator", Component: KalkulatorRakitanPage },
      { path: "cash-flow", Component: CashFlowPage },
      { path: "laporan-laba", Component: LaporanLabaPage },
      { path: "nilai-aset", Component: NilaiAsetPage },
      { path: "pengaturan", Component: PengaturanPage },
      { path: "users", Component: UsersPage },
    ],
  },
]);
