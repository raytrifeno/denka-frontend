import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarIcon,
  FileText,
  FileSpreadsheet,
  Wallet,
  Receipt,
  TrendingUp,
  Percent,
  Coins,
  PiggyBank,
  Wrench,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as ReTooltip,
} from "recharts";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { cn } from "./ui/utils";
import type { Role } from "../navigation";
import { LABEL_METODE } from "../../domain/entities/TransaksiPenjualan";
import type { StatusService } from "../../domain/entities/ServiceOrder";
import { LaporanController } from "../../domain/controllers/LaporanController";
import { exportToExcel } from "../../domain/export/ExcelExport";
import { useController } from "../hooks/use-controller";
import { toast } from "sonner";

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: Date) => format(d, "dd MMM yyyy", { locale: idLocale });

function tujuhHariLalu(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d;
}

// ---------- tabs ----------
type Tab = "penjualan" | "stok" | "terlaris" | "keuntungan" | "service";

const ALL_TABS: { id: Tab; label: string; ownerOnly?: boolean }[] = [
  { id: "penjualan", label: "Laporan Penjualan" },
  { id: "stok", label: "Laporan Stok" },
  { id: "terlaris", label: "Laporan Barang Terlaris" },
  { id: "keuntungan", label: "Laporan Keuntungan", ownerOnly: true },
  { id: "service", label: "Laporan Service" },
];

/**
 * Laporan — boundary class halaman laporan.
 * Semua agregasi (penjualan, stok, terlaris, keuntungan, service)
 * dihitung LaporanController dari data transaksi/mutasi/service asli.
 */
export function Laporan({ role }: { role: Role }) {
  const laporan = LaporanController.getInstance();
  useController(laporan);

  const tabs = ALL_TABS.filter((t) => !t.ownerOnly || role === "pemilik");
  const [tab, setTab] = useState<Tab>("penjualan");
  const [range, setRange] = useState<DateRange | undefined>({
    from: tujuhHariLalu(),
    to: new Date(),
  });
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    setExporting(true);
    const hasil = await exportToExcel();
    setExporting(false);
    if (hasil.sukses) toast.success(hasil.pesan);
    else toast.error(hasil.pesan);
  }

  // guard: jika non-pemilik masih memilih tab keuntungan
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "penjualan";
  const dari = range?.from;
  const sampai = range?.to ?? range?.from;

  return (
    <div id="print-area" className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* heading + export */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Analisis penjualan, stok, keuntungan, dan service toko.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <FileText className="size-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={exporting}>
            <FileSpreadsheet className="size-4" />
            {exporting ? "Mengekspor..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
              activeTab === t.id
                ? "border-amber font-semibold text-primary-700"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker range={range} onChange={setRange} />
      </div>

      {/* content */}
      {activeTab === "penjualan" && <SalesReport dari={dari} sampai={sampai} />}
      {activeTab === "stok" && <StockReport dari={dari} sampai={sampai} />}
      {activeTab === "terlaris" && <TopProductsReport dari={dari} sampai={sampai} />}
      {activeTab === "keuntungan" && role === "pemilik" && <ProfitReport dari={dari} sampai={sampai} />}
      {activeTab === "service" && <ServiceReport dari={dari} sampai={sampai} />}
    </div>
  );
}

type RangeProps = { dari?: Date; sampai?: Date };

// ---------- date range picker ----------
function DateRangePicker({
  range, onChange,
}: { range: DateRange | undefined; onChange: (r: DateRange | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const label =
    range?.from && range?.to
      ? `${fmtDate(range.from)} — ${fmtDate(range.to)}`
      : range?.from
        ? fmtDate(range.from)
        : "Pilih rentang tanggal";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start bg-card font-normal">
          <CalendarIcon className="size-4 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={range} onSelect={onChange} numberOfMonths={2} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// ---------- summary card ----------
type Tone = "primary" | "info" | "success" | "warning";
const TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};
function SummaryCard({
  icon: Icon, label, value, tone,
}: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 py-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display tnum mt-1.5 truncate text-xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[tone])}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 };
const yRupiah = (v: number) => (v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`);

// ---------- sales report ----------
function SalesReport({ dari, sampai }: RangeProps) {
  const laporan = LaporanController.getInstance();
  const data = laporan.laporanPenjualan(dari, sampai);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Wallet} label="Total Penjualan" value={rupiah(data.total)} tone="primary" />
        <SummaryCard icon={Receipt} label="Total Transaksi" value={`${data.jumlahTransaksi} transaksi`} tone="info" />
        <SummaryCard icon={TrendingUp} label="Rata-rata per Transaksi" value={rupiah(data.rataRata)} tone="success" />
      </div>

      <ChartCard title="Penjualan per Hari">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.perHari.map((p) => ({ day: p.label, total: p.total }))} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis tickFormatter={yRupiah} tickLine={false} axisLine={false} width={44} tick={axisTick} />
              <ReTooltip cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [rupiah(v), "Penjualan"]} contentStyle={tipStyle} />
              <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <TableCard title="Detail Transaksi">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Tanggal</TableHead>
              <TableHead>No. Transaksi</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead className="text-center">Jumlah Item</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="pr-6">Metode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.transaksi.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Tidak ada transaksi pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.transaksi.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-6 text-muted-foreground">{fmtDate(t.tanggal)}</TableCell>
                  <TableCell>{t.nomor}</TableCell>
                  <TableCell className="text-muted-foreground">{t.kasir}</TableCell>
                  <TableCell className="text-center">{t.jumlahItem()}</TableCell>
                  <TableCell className="text-right">{rupiah(t.total())}</TableCell>
                  <TableCell className="pr-6"><Badge variant="secondary">{LABEL_METODE[t.metode]}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

// ---------- stock report ----------
function stockStatus(end: number, min: number) {
  if (end === 0) return { label: "Habis", className: "bg-destructive/10 text-destructive" };
  if (end <= min) return { label: "Menipis", className: "bg-warning/15 text-warning" };
  return { label: "Aman", className: "bg-success/15 text-success" };
}
function StockReport({ dari, sampai }: RangeProps) {
  const laporan = LaporanController.getInstance();
  const rows = laporan.laporanStok(dari, sampai);
  return (
    <TableCard title="Mutasi Stok per Barang">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Nama Barang</TableHead>
            <TableHead className="text-center">Stok Awal</TableHead>
            <TableHead className="text-center">Masuk</TableHead>
            <TableHead className="text-center">Keluar / Terjual</TableHead>
            <TableHead className="text-center">Stok Akhir</TableHead>
            <TableHead className="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const st = stockStatus(r.stokAkhir, r.stokMinimum);
            return (
              <TableRow key={r.nama}>
                <TableCell className="pl-6">{r.nama}</TableCell>
                <TableCell className="text-center text-muted-foreground">{r.stokAwal}</TableCell>
                <TableCell className="text-center text-success">+{r.masuk}</TableCell>
                <TableCell className="text-center text-destructive">-{r.keluar}</TableCell>
                <TableCell className="text-center">{r.stokAkhir}</TableCell>
                <TableCell className="pr-6"><Badge className={cn("border-0", st.className)}>{st.label}</Badge></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableCard>
  );
}

// ---------- top products ----------
function TopProductsReport({ dari, sampai }: RangeProps) {
  const laporan = LaporanController.getInstance();
  const rows = laporan.barangTerlaris(10, dari, sampai);
  return (
    <div className="space-y-5">
      <ChartCard title="Top 10 Barang Terlaris">
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: r.nama, sold: r.terjual }))} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ ...axisTick, fontSize: 11 }} />
              <ReTooltip cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [`${v} unit`, "Terjual"]} contentStyle={tipStyle} />
              <Bar dataKey="sold" fill="#F59E0B" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <TableCard title="Peringkat Barang Terlaris">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 w-16">Ranking</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead className="text-center">Jumlah Terjual</TableHead>
              <TableHead className="pr-6 text-right">Total Pendapatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Belum ada penjualan pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p, i) => (
                <TableRow key={p.nama}>
                  <TableCell className="pl-6">
                    <span className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs",
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>{i + 1}</span>
                  </TableCell>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell className="text-center">{p.terjual}</TableCell>
                  <TableCell className="pr-6 text-right">{rupiah(p.pendapatan)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

// ---------- profit report ----------
function ProfitReport({ dari, sampai }: RangeProps) {
  const laporan = LaporanController.getInstance();
  const data = laporan.laporanKeuntungan(dari, sampai);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Coins} label="Total Omset" value={rupiah(data.omset)} tone="primary" />
        <SummaryCard icon={Wallet} label="Total Modal" value={rupiah(data.modal)} tone="warning" />
        <SummaryCard icon={PiggyBank} label="Total Keuntungan" value={rupiah(data.untung)} tone="success" />
        <SummaryCard icon={Percent} label="Margin" value={`${data.marginPersen}%`} tone="info" />
      </div>

      <ChartCard title="Perbandingan Omset vs Keuntungan (4 Minggu Terakhir)">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trenMingguan.map((t) => ({ period: t.periode, omset: t.omset, untung: t.untung }))} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis tickFormatter={yRupiah} tickLine={false} axisLine={false} width={44} tick={axisTick} />
              <ReTooltip formatter={(v: number, n) => [rupiah(v), n === "omset" ? "Omset" : "Keuntungan"]} contentStyle={tipStyle} />
              <Legend formatter={(v) => (v === "omset" ? "Omset" : "Keuntungan")} />
              <Line type="monotone" dataKey="omset" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="untung" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <TableCard title="Detail Keuntungan per Barang">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Nama Barang</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-center">Terjual</TableHead>
              <TableHead className="text-right">Untung / Item</TableHead>
              <TableHead className="pr-6 text-right">Total Keuntungan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.perBarang.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada penjualan pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.perBarang.map((r) => (
                <TableRow key={r.nama}>
                  <TableCell className="pl-6">{r.nama}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{rupiah(r.hargaBeli)}</TableCell>
                  <TableCell className="text-right">{rupiah(r.hargaJual)}</TableCell>
                  <TableCell className="text-center">{r.terjual}</TableCell>
                  <TableCell className="text-right text-success">{rupiah(r.untungPerItem)}</TableCell>
                  <TableCell className="pr-6 text-right text-success">{rupiah(r.totalUntung)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

// ---------- service report ----------
const SVC_BADGE: Record<StatusService, { label: string; className: string }> = {
  antri: { label: "Menunggu", className: "bg-muted text-muted-foreground" },
  diperiksa: { label: "Diperiksa", className: "bg-info/15 text-info" },
  dikerjakan: { label: "Dikerjakan", className: "bg-warning/15 text-warning" },
  sparepart: { label: "Tunggu Sparepart", className: "bg-warning/15 text-warning" },
  selesai: { label: "Selesai", className: "bg-success/15 text-success" },
  diambil: { label: "Sudah Diambil", className: "bg-info/15 text-info" },
};

function ServiceReport({ dari, sampai }: RangeProps) {
  const laporan = LaporanController.getInstance();
  const data = laporan.laporanService(dari, sampai);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Wrench} label="Total Service Masuk" value={`${data.masuk} unit`} tone="primary" />
        <SummaryCard icon={CheckCircle2} label="Service Selesai" value={`${data.selesai} unit`} tone="success" />
        <SummaryCard icon={Clock} label="Service Pending" value={`${data.pending} unit`} tone="warning" />
        <SummaryCard icon={Wallet} label="Pendapatan Service" value={rupiah(data.pendapatan)} tone="info" />
      </div>

      <TableCard title="Detail Service">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">No. Service</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Teknisi</TableHead>
              <TableHead className="text-right">Total Biaya</TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.daftar.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada service pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.daftar.map((s) => {
                const meta = SVC_BADGE[s.status];
                const selesai = s.tanggalSelesai();
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 text-primary">{s.nomor}</TableCell>
                    <TableCell>{s.pelanggan}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(s.tanggalMasuk)}</TableCell>
                    <TableCell className="text-muted-foreground">{selesai ? fmtDate(selesai) : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.teknisi}</TableCell>
                    <TableCell className="text-right">{rupiah(s.totalBiaya())}</TableCell>
                    <TableCell className="pr-6"><Badge className={cn("border-0", meta.className)}>{meta.label}</Badge></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
