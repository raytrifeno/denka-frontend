import { useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Wallet,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "./ui/utils";
import {
  ServiceOrder,
  STATUS_ORDER,
  type ServicePriority,
  type ServiceStatus,
} from "../../domain/entities/ServiceOrder";
import {
  TECHNICIANS,
  ACCESSORY_OPTIONS,
  ServiceController,
  type ServiceErrors,
  type NewServiceForm,
} from "../../domain/controllers/ServiceController";
import { SettingsController } from "../../domain/controllers/SettingsController";
import { useController } from "../hooks/use-controller";
import { printHTML } from "../share";

// ---------- metadata tampilan ----------
const STATUS_META: Record<ServiceStatus, { label: string; color: string }> = {
  antri: { label: "Antri", color: "#94A3B8" },
  diperiksa: { label: "Diperiksa", color: "#2F5C8F" },
  dikerjakan: { label: "Dikerjakan", color: "#F59E0B" },
  sparepart: { label: "Tunggu Sparepart", color: "#F59E0B" },
  selesai: { label: "Selesai", color: "#16A34A" },
  diambil: { label: "Diambil", color: "#1E3A5F" },
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: Date) => format(d, "dd MMM yyyy", { locale: idLocale });
const fmtDateTime = (d: Date) => format(d, "dd MMM yyyy, HH:mm", { locale: idLocale });

/**
 * Service — boundary class tiket service.
 * Daftar tiket ditampilkan sebagai tabel; status diubah lewat dropdown per baris
 * atau di panel detail. Alur status, sparepart (terhubung stok), dan pembuatan
 * tiket dikelola ServiceController; komponen hanya menyimpan state tampilan.
 */
export function Service() {
  const controller = ServiceController.getInstance();
  useController(controller);

  const [filter, setFilter] = useState<"all" | ServiceStatus>("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const counts = controller.countByStatus();
  const visible = controller.list(search, filter);
  const detail = detailId ? controller.findById(detailId) ?? null : null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Service Komputer</h1>
        <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Service Baru
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama pelanggan atau nomor service..."
          className="bg-card pl-9"
        />
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label="Semua" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} label={STATUS_META[s].label} count={counts[s]} active={filter === s} onClick={() => setFilter(s)} color={STATUS_META[s].color} />
        ))}
      </div>

      {/* tabel tiket */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">No. Service</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Teknisi</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead className="pr-4 text-right">Total Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Tidak ada tiket service.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
                  <TableCell className="pl-4 font-mono text-sm font-semibold text-primary-700">{s.number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.customer}</span>
                      {s.priority === "urgent" && (
                        <Badge className="border-0 bg-destructive/10 text-destructive">
                          <AlertTriangle className="size-3" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.unitType} · {s.brand}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={s.status} onValueChange={(v) => controller.changeStatus(s.id, v as ServiceStatus)}>
                      <SelectTrigger className="h-8 w-full bg-card">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s.status].color }} />
                          <SelectValue />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((st) => (
                          <SelectItem key={st} value={st}>{STATUS_META[st].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.technician}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(s.receivedAt)}</TableCell>
                  <TableCell className="pr-4 text-right tnum">{rupiah(s.totalCost())}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServiceDrawer service={detail} onClose={() => setDetailId(null)} />
      <AddServiceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function FilterChip({
  label, count, active, onClick, color,
}: { label: string; count: number; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active ? "border-primary-700 bg-primary-700 text-white" : "border-border bg-card text-muted-foreground hover:border-primary-500 hover:text-foreground",
      )}
    >
      {color && !active && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={cn("flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs", active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

// ---------- cetak invoice & update WhatsApp ----------
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

function invoiceHTML(service: ServiceOrder): string {
  const store = SettingsController.getInstance().store;
  const parts = service.parts
    .map((p) => `<div class="row"><span>${p.quantity}× ${esc(p.name)}</span><span>${rupiah(p.subtotal())}</span></div>`)
    .join("");
  return `
    <h1>${esc(store.name)}</h1>
    <p class="center muted">${esc(store.address)}<br>${esc(store.phone)}</p>
    <hr>
    <div class="row"><span class="muted">Invoice</span><span>${esc(service.number)}</span></div>
    <div class="row"><span class="muted">Tanggal</span><span>${fmtDate(service.receivedAt)}</span></div>
    <div class="row"><span class="muted">Pelanggan</span><span>${esc(service.customer)}</span></div>
    <div class="row"><span class="muted">Unit</span><span>${esc(service.unitType)} ${esc(service.brand)}</span></div>
    <hr>
    <div class="row"><span class="muted">Keluhan</span></div>
    <p>${esc(service.complaint)}</p>
    ${service.diagnosis ? `<div class="row"><span class="muted">Diagnosa</span></div><p>${esc(service.diagnosis)}</p>` : ""}
    <hr>
    ${parts || `<p class="muted">Tanpa sparepart</p>`}
    <div class="row"><span class="muted">Biaya Jasa</span><span>${rupiah(service.serviceFee)}</span></div>
    <hr>
    <div class="row total"><span>TOTAL</span><span>${rupiah(service.totalCost())}</span></div>
    <hr>
    <p class="center muted">Terima kasih — ${esc(store.name)}</p>`;
}

// ---------- detail drawer ----------
function ServiceDrawer({
  service, onClose,
}: { service: ServiceOrder | null; onClose: () => void }) {
  return (
    <Sheet open={!!service} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        {service && <DrawerBody service={service} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ service }: { service: ServiceOrder }) {
  const controller = ServiceController.getInstance();
  const [partId, setPartId] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partError, setPartError] = useState<string | null>(null);

  function addPart() {
    if (!partId) return;
    const result = controller.addPart(service.id, partId, Math.max(1, Number(partQty) || 1));
    if (!result.success) {
      setPartError(result.message ?? "Gagal menambah sparepart.");
      return;
    }
    setPartError(null);
    setPartId("");
    setPartQty("1");
  }

  const total = service.totalCost();

  return (
    <>
      {/* header */}
      <SheetHeader className="space-y-0 border-b border-border p-5 pr-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SheetTitle className="font-mono text-primary-700">{service.number}</SheetTitle>
          <div className="flex items-center gap-2">
            <Select value={service.status} onValueChange={(v) => controller.changeStatus(service.id, v as ServiceStatus)}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" aria-label="Cetak invoice service" onClick={() => printHTML(invoiceHTML(service))}>
              <Printer className="size-4" />
            </Button>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <Section title="Pelanggan">
          <ReadField label="Nama" value={service.customer} />
          <ReadField label="No. WhatsApp" value={service.phone} />
          <ReadField label="Alamat" value={service.address || "-"} />
        </Section>

        <Separator />

        <Section title="Unit">
          <div className="grid grid-cols-2 gap-3">
            <ReadField label="Jenis" value={service.unitType} />
            <ReadField label="Merk" value={service.brand} />
            <ReadField label="Model" value={service.model || "-"} />
            <ReadField label="No. Seri" value={service.serialNo || "-"} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Kelengkapan dibawa</p>
            <div className="flex flex-wrap gap-2">
              {ACCESSORY_OPTIONS.map((a) => {
                const on = service.accessories.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => controller.toggleAccessory(service.id, a)}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-primary-700 bg-primary-100 text-primary-700" : "border-border bg-card text-muted-foreground hover:border-primary-500")}
                  >
                    <Checkbox checked={on} className="pointer-events-none size-3.5" />
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Keluhan & Diagnosa">
          <div className="space-y-2">
            <Label>Keluhan Pelanggan</Label>
            <Textarea value={service.complaint} onChange={(e) => controller.updateInfo(service.id, { complaint: e.target.value })} className="min-h-20" />
          </div>
          <div className="space-y-2">
            <Label>Hasil Diagnosa Teknisi</Label>
            <Textarea value={service.diagnosis || ""} onChange={(e) => controller.updateInfo(service.id, { diagnosis: e.target.value })} placeholder="Tuliskan result pemeriksaan..." className="min-h-20" />
          </div>
          <div className="space-y-2">
            <Label>Teknisi Ditugaskan</Label>
            <Select value={service.technician} onValueChange={(v) => controller.updateInfo(service.id, { technician: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Separator />

        <Section title="Sparepart & Biaya">
          <div className="space-y-2">
            {service.parts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{p.name} <span className="text-muted-foreground">× {p.quantity}</span></span>
                <div className="flex items-center gap-3">
                  <span>{rupiah(p.subtotal())}</span>
                  <button type="button" onClick={() => controller.removePart(service.id, p.id)} aria-label="Hapus" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <Select value={partId} onValueChange={(v) => { setPartId(v); setPartError(null); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih barang dari inventori" /></SelectTrigger>
                  <SelectContent>
                    {controller.partOptions().map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {rupiah(p.sellPrice)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" min={1} value={partQty} onChange={(e) => setPartQty(e.target.value)} className="w-16" />
              <Button type="button" variant="outline" onClick={addPart} disabled={!partId}>
                <Plus className="size-4" />
                Tambah Sparepart
              </Button>
            </div>
            {partError && <p className="text-xs text-destructive">{partError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Biaya Jasa</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                inputMode="numeric"
                value={service.serviceFee ? service.serviceFee.toLocaleString("id-ID") : ""}
                onChange={(e) => controller.updateInfo(service.id, { serviceFee: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                placeholder="0"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-muted-foreground">Total Biaya</span>
            <span className="text-2xl font-bold text-primary-900">{rupiah(total)}</span>
          </div>
        </Section>

        <Separator />

        <Section title="Riwayat Status">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {[...service.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] top-0.5 size-3 rounded-full ring-4 ring-card" style={{ backgroundColor: STATUS_META[h.status].color }} />
                <p className="text-sm">{STATUS_META[h.status].label}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(h.at)}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* sticky footer */}
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-success text-white hover:bg-success/90"
            onClick={() => controller.changeStatus(service.id, "selesai")}
            disabled={service.isDone()}
          >
            <CheckCircle2 className="size-4" />
            Tandai Selesai
          </Button>
          <Button
            className="bg-amber font-semibold text-primary-900 hover:bg-amber/90"
            onClick={() => controller.changeStatus(service.id, "diambil")}
            disabled={service.status === "diambil"}
          >
            <Wallet className="size-4" />
            Bayar & Tutup
          </Button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base">{title}</h3>
      {children}
    </div>
  );
}
function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// ---------- add dialog ----------
const EMPTY_SERVICE: NewServiceForm = {
  customer: "", phone: "", address: "", unitType: "", brand: "", model: "",
  complaint: "", priority: "normal", technician: TECHNICIANS[0],
};

function AddServiceDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const controller = ServiceController.getInstance();
  const [form, setForm] = useState<NewServiceForm>(EMPTY_SERVICE);
  const [errors, setErrors] = useState<ServiceErrors>({});

  function set<K extends keyof NewServiceForm>(k: K, v: NewServiceForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }
  function submit() {
    const result = controller.createService(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setForm(EMPTY_SERVICE);
    setErrors({});
    onOpenChange(false);
  }
  function handleOpen(v: boolean) {
    if (!v) { setForm(EMPTY_SERVICE); setErrors({}); }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Service Baru</DialogTitle>
          <DialogDescription>Data awal penerimaan unit service pelanggan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-base">Data Pelanggan</h3>
            <FormField label="Nama Pelanggan" error={errors.customer}>
              <Input value={form.customer} onChange={(e) => set("customer", e.target.value)} aria-invalid={!!errors.customer} className={cn(errors.customer && "border-destructive")} />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="No. WhatsApp" error={errors.phone}>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xxxxxxxxxx" aria-invalid={!!errors.phone} className={cn(errors.phone && "border-destructive")} />
              </FormField>
              <FormField label="Alamat (opsional)">
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base">Data Unit</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="Jenis Unit" error={errors.unitType}>
                <Select value={form.unitType} onValueChange={(v) => set("unitType", v)}>
                  <SelectTrigger aria-invalid={!!errors.unitType} className={cn("w-full", errors.unitType && "border-destructive")}>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="Printer">Printer</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Merk" error={errors.brand}>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="ASUS, HP..." aria-invalid={!!errors.brand} className={cn(errors.brand && "border-destructive")} />
              </FormField>
              <FormField label="Model (opsional)">
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Prioritas">
                <Select value={form.priority} onValueChange={(v) => set("priority", v as ServicePriority)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Teknisi">
                <Select value={form.technician} onValueChange={(v) => set("technician", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base">Keluhan Awal</h3>
            <FormField label="Keluhan Pelanggan" error={errors.complaint}>
              <Textarea value={form.complaint} onChange={(e) => set("complaint", e.target.value)} placeholder="Jelaskan keluhan/kerusakan unit..." aria-invalid={!!errors.complaint} className={cn("min-h-24", errors.complaint && "border-destructive")} />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Batal</Button>
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={submit}>Simpan &amp; Buat Service</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
