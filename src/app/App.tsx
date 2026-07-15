import { useEffect, useState } from "react";
import { AppSidebar } from "./components/app-sidebar";
import { Topbar } from "./components/topbar";
import { PageContent } from "./components/page-content";
import { Dashboard } from "./components/dashboard";
import { POS } from "./components/pos";
import { DataBarang } from "./components/data-barang";
import { StokBarang } from "./components/stok-barang";
import { Service } from "./components/service";
import { Laporan } from "./components/laporan";
import { DataSupplier } from "./components/data-supplier";
import { ManajemenPengguna } from "./components/manajemen-pengguna";
import { Pengaturan } from "./components/pengaturan";
import { Login } from "./components/login";
import { Toaster } from "./components/ui/sonner";
import { menuForRole } from "./navigation";
import { AuthController } from "../domain/controllers/AuthController";
import { useController } from "./hooks/use-controller";

/**
 * App — boundary utama. Status login & role diambil dari AuthController
 * (controller class), bukan disimpan sendiri di komponen.
 */
export default function App() {
  const auth = AuthController.getInstance();
  useController(auth);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("dashboard");

  const role = auth.role;

  // Jika role kehilangan akses ke menu aktif (mis. Pemilik -> Admin saat
  // membuka "Laporan"), kembali ke menu pertama yang tersedia.
  useEffect(() => {
    const allowed = menuForRole(role);
    if (!allowed.some((item) => item.id === active)) {
      setActive(allowed[0]?.id ?? "dashboard");
    }
  }, [role, active]);

  // Geser dari tepi kiri ke kanan untuk membuka sidebar (mobile).
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let fromEdge = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      fromEdge = t.clientX < 28;
    };
    const onEnd = (e: TouchEvent) => {
      if (!fromEdge) return;
      fromEdge = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (dx > 60 && Math.abs(dy) < 50) setMobileOpen(true);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (!auth.isLoggedIn) {
    return <Login onLogin={() => setActive("dashboard")} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40 text-foreground">
      <AppSidebar
        role={role}
        active={active}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onSelect={(id) => { setActive(id); setMobileOpen(false); }}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={role}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={() => auth.logout()}
        />
        <main className="flex-1 overflow-y-auto">
          {active === "dashboard" ? (
            <Dashboard role={role} onNavigate={setActive} />
          ) : active === "pos" ? (
            <POS />
          ) : active === "barang" ? (
            <DataBarang />
          ) : active === "stok" ? (
            <StokBarang />
          ) : active === "service" ? (
            <Service />
          ) : active === "laporan" && role === "pemilik" ? (
            <Laporan role={role} />
          ) : active === "supplier" && role === "pemilik" ? (
            <DataSupplier />
          ) : active === "pengguna" && role === "pemilik" ? (
            <ManajemenPengguna />
          ) : active === "pengaturan" ? (
            <Pengaturan />
          ) : (
            <PageContent active={active} role={role} />
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
