import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowDownUp,
  Wrench,
  BarChart3,
  Truck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Role = "pemilik" | "admin";

/** Kelompok menu — mengikuti alur kerja toko, bukan sekadar daftar panjang. */
export type MenuGroup = "Operasional" | "Inventori" | "Manajemen";

export type MenuItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: MenuGroup;
  /** Roles that are allowed to see this menu item. */
  roles: Role[];
};

export const NAV_ITEMS: MenuItem[] = [
  // ----- Operasional: pekerjaan harian kasir & teknisi -----
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Ringkasan aktivitas toko, penjualan, dan service hari ini.",
    icon: LayoutDashboard,
    group: "Operasional",
    roles: ["pemilik", "admin"],
  },
  {
    id: "pos",
    label: "Kasir (POS)",
    description: "Point of Sale untuk memproses penjualan barang ke pelanggan.",
    icon: ShoppingCart,
    group: "Operasional",
    roles: ["pemilik", "admin"],
  },
  {
    id: "service",
    label: "Service Komputer",
    description: "Manajemen tiket jasa service & reparasi komputer pelanggan.",
    icon: Wrench,
    group: "Operasional",
    roles: ["pemilik", "admin"],
  },
  // ----- Inventori: barang & pemasok -----
  {
    id: "barang",
    label: "Data Barang",
    description: "Katalog laptop, elektronik, dan sparepart yang dijual toko.",
    icon: Package,
    group: "Inventori",
    roles: ["pemilik", "admin"],
  },
  {
    id: "stok",
    label: "Stok Barang",
    description: "Pencatatan barang masuk dan keluar serta kartu stok.",
    icon: ArrowDownUp,
    group: "Inventori",
    roles: ["pemilik", "admin"],
  },
  {
    id: "supplier",
    label: "Data Supplier",
    description: "Daftar pemasok barang dan informasi kontak supplier.",
    icon: Truck,
    group: "Inventori",
    roles: ["pemilik", "admin"],
  },
  // ----- Manajemen: khusus pengelolaan toko -----
  {
    id: "laporan",
    label: "Laporan",
    description: "Laporan penjualan, keuntungan, dan margin (khusus Pemilik).",
    icon: BarChart3,
    group: "Manajemen",
    roles: ["pemilik"],
  },
  {
    id: "pengguna",
    label: "Manajemen Pengguna",
    description: "Kelola akun & hak akses pengguna (khusus Pemilik).",
    icon: Users,
    group: "Manajemen",
    roles: ["pemilik"],
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    description: "Pengaturan toko, struk, dan preferensi aplikasi.",
    icon: Settings,
    group: "Manajemen",
    roles: ["pemilik", "admin"],
  },
];

export const MENU_GROUPS: MenuGroup[] = ["Operasional", "Inventori", "Manajemen"];

export const ROLE_LABEL: Record<Role, string> = {
  pemilik: "Pemilik",
  admin: "Admin",
};

export function menuForRole(role: Role): MenuItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
