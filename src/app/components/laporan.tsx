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
import { LABEL_PAYMENT_METHOD } from "../../domain/entities/Sale";
import type { ServiceStatus } from "../../domain/entities/ServiceOrder";
import { ReportController } from "../../domain/controllers/ReportController";
import { exportToExcel } from "../../domain/export/ExcelExport";
import { useController } from "../hooks/use-controller";
import { toast } from "sonner";

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: Date) => format(d, "dd MMM yyyy", { locale: idLocale });

function sevenDaysAgo(): Date {
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
 * dihitung ReportController dari data transaksi/mutasi/service asli.
 */
export function Laporan({ role }: { role: Role }) {
  const report = ReportController.getInstance();
  useController(report);

  const tabs = ALL_TABS.filter((t) => !t.ownerOnly || role === "pemilik");
  const [tab, setTab] = useState<Tab>("penjualan");
  const [range, setRange] = useState<DateRange | undefined>({
    from: sevenDaysAgo(),
    to: new Date(),
  });
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    setExporting(true);
    const result = await exportToExcel(range?.from, range?.to ?? range?.from);
    setExporting(false);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  // guard: jika non-pemilik masih memilih tab keuntungan
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "penjualan";
  const from = range?.from;
  const to = range?.to ?? range?.from;

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
      {activeTab === "penjualan" && <SalesReport from={from} to={to} />}
      {activeTab === "stok" && <StockReport from={from} to={to} />}
      {activeTab === "terlaris" && <TopProductsReport from={from} to={to} />}
      {activeTab === "keuntungan" && role === "pemilik" && <ProfitReport from={from} to={to} />}
      {activeTab === "service" && <ServiceReport from={from} to={to} />}
    </div>
  );
}

type RangeProps = { from?: Date; to?: Date };

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
function SalesReport({ from, to }: RangeProps) {
  const report = ReportController.getInstance();
  const data = report.salesReport(from, to);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Wallet} label="Total Penjualan" value={rupiah(data.total)} tone="primary" />
        <SummaryCard icon={Receipt} label="Total Transaksi" value={`${data.saleCount} transaksi`} tone="info" />
        <SummaryCard icon={TrendingUp} label="Rata-rata per Transaksi" value={rupiah(data.average)} tone="success" />
      </div>

      <ChartCard title="Penjualan per Hari">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.perDay.map((p) => ({ day: p.label, total: p.total }))} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
            {data.sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Tidak ada transaksi pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.sales.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-6 text-muted-foreground">{fmtDate(t.date)}</TableCell>
                  <TableCell>{t.number}</TableCell>
                  <TableCell className="text-muted-foreground">{t.cashier}</TableCell>
                  <TableCell className="text-center">{t.itemCount()}</TableCell>
                  <TableCell className="text-right">{rupiah(t.total())}</TableCell>
                  <TableCell className="pr-6"><Badge variant="secondary">{LABEL_PAYMENT_METHOD[t.method]}</Badge></TableCell>
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
function StockReport({ from, to }: RangeProps) {
  const report = ReportController.getInstance();
  const rows = report.stockReport(from, to);
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
            const st = stockStatus(r.closingStock, r.minStock);
            return (
              <TableRow key={r.name}>
                <TableCell className="pl-6">{r.name}</TableCell>
                <TableCell className="text-center text-muted-foreground">{r.openingStock}</TableCell>
                <TableCell className="text-center text-success">+{r.incoming}</TableCell>
                <TableCell className="text-center text-destructive">-{r.outgoing}</TableCell>
                <TableCell className="text-center">{r.closingStock}</TableCell>
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
function TopProductsReport({ from, to }: RangeProps) {
  const report = ReportController.getInstance();
  const rows = report.topProducts(10, from, to);
  return (
    <div className="space-y-5">
      <ChartCard title="Top 10 Barang Terlaris">
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: r.name, sold: r.sold }))} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
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
                <TableRow key={p.name}>
                  <TableCell className="pl-6">
                    <span className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs",
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>{i + 1}</span>
                  </TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-center">{p.sold}</TableCell>
                  <TableCell className="pr-6 text-right">{rupiah(p.revenue)}</TableCell>
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
function ProfitReport({ from, to }: RangeProps) {
  const report = ReportController.getInstance();
  const data = report.profitReport(from, to);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Coins} label="Total Omset" value={rupiah(data.revenue)} tone="primary" />
        <SummaryCard icon={Wallet} label="Total Modal" value={rupiah(data.cost)} tone="warning" />
        <SummaryCard icon={PiggyBank} label="Total Keuntungan" value={rupiah(data.profit)} tone="success" />
        <SummaryCard icon={Percent} label="Margin" value={`${data.marginPercent}%`} tone="info" />
      </div>

      <ChartCard title="Perbandingan Omset vs Keuntungan (4 Minggu Terakhir)">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weeklyTrend.map((t) => ({ period: t.period, omset: t.revenue, untung: t.profit }))} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
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
            {data.perProduct.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada penjualan pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.perProduct.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="pl-6">{r.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{rupiah(r.purchasePrice)}</TableCell>
                  <TableCell className="text-right">{rupiah(r.sellPrice)}</TableCell>
                  <TableCell className="text-center">{r.sold}</TableCell>
                  <TableCell className="text-right text-success">{rupiah(r.profitPerItem)}</TableCell>
                  <TableCell className="pr-6 text-right text-success">{rupiah(r.totalProfit)}</TableCell>
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
const SVC_BADGE: Record<ServiceStatus, { label: string; className: string }> = {
  antri: { label: "Menunggu", className: "bg-muted text-muted-foreground" },
  diperiksa: { label: "Diperiksa", className: "bg-info/15 text-info" },
  dikerjakan: { label: "Dikerjakan", className: "bg-warning/15 text-warning" },
  sparepart: { label: "Tunggu Sparepart", className: "bg-warning/15 text-warning" },
  selesai: { label: "Selesai", className: "bg-success/15 text-success" },
  diambil: { label: "Sudah Diambil", className: "bg-info/15 text-info" },
};

function ServiceReport({ from, to }: RangeProps) {
  const report = ReportController.getInstance();
  const data = report.serviceReport(from, to);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Wrench} label="Total Service Masuk" value={`${data.incoming} unit`} tone="primary" />
        <SummaryCard icon={CheckCircle2} label="Service Selesai" value={`${data.done} unit`} tone="success" />
        <SummaryCard icon={Clock} label="Service Pending" value={`${data.pending} unit`} tone="warning" />
        <SummaryCard icon={Wallet} label="Pendapatan Service" value={rupiah(data.revenue)} tone="info" />
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
            {data.list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada service pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.list.map((s) => {
                const meta = SVC_BADGE[s.status];
                const selesai = s.completedAt();
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 text-primary">{s.number}</TableCell>
                    <TableCell>{s.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(s.receivedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{selesai ? fmtDate(selesai) : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.technician}</TableCell>
                    <TableCell className="text-right">{rupiah(s.totalCost())}</TableCell>
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
