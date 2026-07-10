import { useState } from "react";
import {
  Wallet,
  Receipt,
  Wrench,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package2,
  PackageX,
  Clock,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "./ui/utils";
import type { Role } from "../navigation";
import type { KategoriBarang } from "../../domain/entities/Barang";
import type { StatusService } from "../../domain/entities/ServiceOrder";
import { LaporanController } from "../../domain/controllers/LaporanController";
import { useController } from "../hooks/use-controller";

type DashboardProps = {
  role: Role;
  onNavigate: (id: string) => void;
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const CAT_LABEL: Record<KategoriBarang, string> = {
  laptop: "Laptop", pc: "PC & Komponen", aksesoris: "Aksesoris", sparepart: "Sparepart", lainnya: "Lainnya",
};
const CAT_TINT: Record<KategoriBarang, string> = {
  laptop: "bg-primary-100 text-primary-700",
  pc: "bg-primary-100 text-primary-500",
  aksesoris: "bg-amber-100 text-amber",
  sparepart: "bg-success/15 text-success",
  lainnya: "bg-muted text-muted-foreground",
};

const SVC_BADGE: Record<StatusService, { label: string; className: string }> = {
  antri: { label: "Antri", className: "bg-muted text-muted-foreground" },
  diperiksa: { label: "Diperiksa", className: "bg-primary-100 text-primary-500" },
  dikerjakan: { label: "Dikerjakan", className: "bg-amber-100 text-amber" },
  sparepart: { label: "Tunggu Sparepart", className: "bg-amber-100 text-amber" },
  selesai: { label: "Selesai", className: "bg-success/15 text-success" },
  diambil: { label: "Diambil", className: "bg-primary-100 text-primary-700" },
};

const PERIODS = [
  { value: "hari", label: "Hari Ini" },
  { value: "minggu", label: "Minggu Ini" },
  { value: "bulan", label: "Bulan Ini" },
];

/**
 * Dashboard — boundary class ringkasan toko.
 * Seluruh angka dihitung LaporanController dari data transaksi, service,
 * stok, dan mutasi yang sama dengan modul lain (tidak ada data tiruan).
 */
export function Dashboard({ role, onNavigate }: DashboardProps) {
  const laporan = LaporanController.getInstance();
  useController(laporan);

  const [period, setPeriod] = useState("hari");
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const tren = laporan.trenVsKemarin();
  const stokMenipis = laporan.stokMenipis();
  const seminggu = new Date();
  seminggu.setDate(seminggu.getDate() - 6);
  const topProducts = laporan.barangTerlaris(5, seminggu, new Date());
  const recentServices = laporan.serviceTerbaru(5);
  const attention = laporan.perluPerhatian();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <Calendar className="size-4" />
            {today}
          </span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role === "pemilik" ? (
          <KpiCard
            icon={Wallet} tone="primary" label="Penjualan Hari Ini"
            value={rupiah(laporan.penjualanHariIni())}
            context={
              tren ? (
                <span className={cn("flex items-center gap-1", tren.naik ? "text-success" : "text-destructive")}>
                  {tren.naik ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {tren.persen} vs kemarin
                </span>
              ) : (
                "belum ada pembanding kemarin"
              )
            }
            onClick={() => onNavigate("laporan")}
          />
        ) : (
          <KpiCard
            icon={Receipt} tone="primary" label="Transaksi Hari Ini"
            value={String(laporan.jumlahTransaksiHariIni())}
            context="nota tercatat sejak buka"
            onClick={() => onNavigate("pos")}
          />
        )}
        {role === "pemilik" ? (
          <KpiCard
            icon={Receipt} tone="info" label="Transaksi Hari Ini"
            value={String(laporan.jumlahTransaksiHariIni())}
            context="nota tercatat sejak buka"
            onClick={() => onNavigate("pos")}
          />
        ) : (
          <KpiCard
            icon={Wrench} tone="info" label="Service Selesai Hari Ini"
            value={`${laporan.serviceSelesaiHariIni()} unit`}
            context="siap dikabari ke pelanggan"
            onClick={() => onNavigate("service")}
          />
        )}
        <KpiCard
          icon={Wrench} tone="amber" label="Service Berjalan"
          value={`${laporan.serviceBerjalan()} unit`}
          context="tiket aktif di papan service"
          onClick={() => onNavigate("service")}
        />
        <KpiCard
          icon={AlertTriangle} tone="amber" label="Stok Menipis"
          value={`${stokMenipis.length} item`}
          context={stokMenipis.length > 0 ? "di bawah batas minimum — cek stok" : "semua stok di atas batas aman"}
          onClick={() => onNavigate("stok")}
        />
      </div>

      {/* row 2: sales trend + service donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tren Penjualan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={laporan.trenPenjualan(7).map((t) => ({ day: t.label, total: t.total }))} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E3A5F" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1E3A5F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`)}
                    tickLine={false} axisLine={false} width={44} tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <ReTooltip
                    cursor={{ stroke: "#2F5C8F", strokeDasharray: "3 3" }}
                    formatter={(v: number) => [rupiah(v), "Penjualan"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E9F0", fontSize: 13 }}
                  />
                  <Area
                    type="monotone" dataKey="total"
                    stroke="#1E3A5F" strokeWidth={2.5}
                    fill="url(#salesFill)"
                    dot={{ r: 3, fill: "#1E3A5F" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Ringkasan Service</CardTitle></CardHeader>
          <CardContent>
            <ServiceDonut />
          </CardContent>
        </Card>
      </div>

      {/* row 3: top products + recent services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Barang Terlaris Minggu Ini</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan minggu ini.</p>
            ) : (
              topProducts.map((p) => (
                <div key={p.nama} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{p.nama}</p>
                    <Badge className={cn("mt-0.5 border-0", CAT_TINT[p.kategori])}>{CAT_LABEL[p.kategori]}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="tnum font-semibold text-foreground">{p.terjual} terjual</p>
                    <p className="tnum text-xs text-muted-foreground">{rupiah(p.pendapatan)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Service Terbaru</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {recentServices.map((s) => {
              const meta = SVC_BADGE[s.status];
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{s.pelanggan}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.jenisUnit} {s.merk}</p>
                  </div>
                  <Badge className={cn("border-0", meta.className)}>{meta.label}</Badge>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("service")}>
                    Detail
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* row 4: needs attention */}
      <Card className="border-border shadow-sm" style={{ borderLeft: "3px solid #F59E0B" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber" />
            Perlu Perhatian
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attention.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada yang perlu diperhatikan. Semua aman!</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {attention.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onNavigate(a.tipe === "stok" ? "stok" : "service")}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    a.tipe === "stok" ? "bg-amber-100 text-amber" : "bg-primary-100 text-primary-700",
                  )}>
                    {a.tipe === "stok" ? <PackageX className="size-4" /> : <Clock className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{a.judul}</span>
                    <span className="block text-xs text-muted-foreground">{a.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- KPI card ----------
type Tone = "primary" | "info" | "amber";
const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-700",
  info: "bg-primary-100 text-primary-500",
  amber: "bg-amber-100 text-amber",
};

function KpiCard({
  icon: Icon, tone, label, value, context, onClick,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  context?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      <Card className="relative overflow-hidden border-border shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_CLASS[tone])}>
              <Icon className="size-4" />
            </span>
          </div>
          <p className="font-display tnum mt-3 truncate text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
            {value}
          </p>
          <div className="mt-1.5 min-h-4 text-xs text-muted-foreground">{context}</div>
          {/* aksen amber muncul saat kartu disorot */}
          <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-amber transition-transform duration-300 group-hover:scale-x-100" />
        </CardContent>
      </Card>
    </button>
  );
}

// ---------- service donut ----------
function ServiceDonut() {
  const laporan = LaporanController.getInstance();
  const komposisi = laporan.komposisiService();
  const data = [
    { key: "antri", label: "Antri", value: komposisi.antri, color: "#94A3B8" },
    { key: "dikerjakan", label: "Dikerjakan", value: komposisi.dikerjakan, color: "#F59E0B" },
    { key: "selesai", label: "Selesai", value: komposisi.selesai, color: "#16A34A" },
    { key: "diambil", label: "Diambil", value: komposisi.diambil, color: "#2F5C8F" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <ReTooltip
              formatter={(v: number, n) => [`${v} unit`, n]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E9F0", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">Total Unit</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
