import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus,
  Search,
  Printer,
  MessageCircle,
  CheckCircle2,
  Wallet,
  Trash2,
  Clock,
  Laptop,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
  URUTAN_STATUS,
  type PrioritasService,
  type StatusService,
} from "../../domain/entities/ServiceOrder";
import {
  DAFTAR_TEKNISI,
  PILIHAN_KELENGKAPAN,
  ServiceController,
  type ErrorService,
  type FormServiceBaru,
} from "../../domain/controllers/ServiceController";
import { useController } from "../hooks/use-controller";

// ---------- metadata tampilan ----------
const STATUS_META: Record<StatusService, { label: string; color: string; badge: string }> = {
  antri: { label: "Antri", color: "#94A3B8", badge: "bg-muted text-muted-foreground" },
  diperiksa: { label: "Diperiksa", color: "#2F5C8F", badge: "bg-primary-100 text-primary-500" },
  dikerjakan: { label: "Dikerjakan", color: "#F59E0B", badge: "bg-amber-100 text-amber" },
  sparepart: { label: "Tunggu Sparepart", color: "#F59E0B", badge: "bg-amber-100 text-amber" },
  selesai: { label: "Selesai", color: "#16A34A", badge: "bg-success/15 text-success" },
  diambil: { label: "Diambil", color: "#1E3A5F", badge: "bg-primary-100 text-primary-700" },
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: Date) => format(d, "dd MMM yyyy", { locale: idLocale });
const fmtDateTime = (d: Date) => format(d, "dd MMM yyyy, HH:mm", { locale: idLocale });
const initials = (name: string) => name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const CARD_DND = "service-card";

/**
 * Service — boundary class tiket service.
 * Alur status, sparepart (terhubung stok), dan pembuatan tiket dikelola
 * ServiceController; komponen hanya state tampilan (filter, drawer, dialog).
 */
export function Service() {
  const controller = ServiceController.getInstance();
  useController(controller);

  const [filter, setFilter] = useState<"all" | StatusService>("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const counts = controller.hitungPerStatus();
  const visible = controller.daftar(search, filter);
  const detail = detailId ? controller.cariById(detailId) ?? null : null;
  const columns = filter === "all" ? URUTAN_STATUS : URUTAN_STATUS.filter((s) => s === filter);

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
        {URUTAN_STATUS.map((s) => (
          <FilterChip key={s} label={STATUS_META[s].label} count={counts[s]} active={filter === s} onClick={() => setFilter(s)} color={STATUS_META[s].color} />
        ))}
      </div>

      {/* kanban */}
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
          {columns.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              services={visible.filter((s) => s.status === status)}
              onDropCard={(id) => controller.ubahStatus(id, status)}
              onOpen={setDetailId}
            />
          ))}
        </div>
      </DndProvider>

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

// ---------- column ----------
function KanbanColumn({
  status, services, onDropCard, onOpen,
}: { status: StatusService; services: ServiceOrder[]; onDropCard: (id: string) => void; onOpen: (id: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: CARD_DND,
    drop: (item: { id: string }) => onDropCard(item.id),
    collect: (m) => ({ isOver: m.isOver() }),
  }), [onDropCard]);

  const meta = STATUS_META[status];

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={cn("flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors", isOver ? "border-primary-500 bg-primary-100/50" : "border-border")}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl px-3 py-3"
        style={{ backgroundColor: meta.color + "1A", borderBottom: `2px solid ${meta.color}` }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <span className="flex min-w-6 items-center justify-center rounded-full bg-card px-1.5 text-xs text-foreground">
          {services.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8 text-xs text-muted-foreground">
            Tarik kartu ke sini
          </div>
        ) : (
          services.map((s) => <ServiceCard key={s.id} service={s} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

// ---------- card ----------
function ServiceCard({ service, onOpen }: { service: ServiceOrder; onOpen: (id: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: CARD_DND,
    item: { id: service.id },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [service.id]);

  const meta = STATUS_META[service.status];

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={() => onOpen(service.id)}
      style={{ borderLeft: `3px solid ${meta.color}` }}
      className={cn(
        "cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary-700">{service.nomor}</span>
        {service.prioritas === "urgent" && (
          <Badge className="border-0 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-3" />
            Urgent
          </Badge>
        )}
      </div>
      <p className="mt-1.5 font-semibold text-foreground">{service.pelanggan}</p>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Laptop className="size-3.5" />
        {service.jenisUnit} · {service.merk}
      </div>
      <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{service.keluhan}</p>
      <Separator className="my-2.5" />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {fmtDate(service.tanggalMasuk)}
        </span>
        <div className="flex items-center gap-1.5">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials(service.teknisi)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{service.teknisi}</span>
        </div>
      </div>
    </div>
  );
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
    const hasil = controller.tambahSparepart(service.id, partId, Math.max(1, Number(partQty) || 1));
    if (!hasil.sukses) {
      setPartError(hasil.pesan ?? "Gagal menambah sparepart.");
      return;
    }
    setPartError(null);
    setPartId("");
    setPartQty("1");
  }

  const total = service.totalBiaya();

  return (
    <>
      {/* header */}
      <SheetHeader className="space-y-0 border-b border-border p-5 pr-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SheetTitle className="font-mono text-primary-700">{service.nomor}</SheetTitle>
          <div className="flex items-center gap-2">
            <Select value={service.status} onValueChange={(v) => controller.ubahStatus(service.id, v as StatusService)}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {URUTAN_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" aria-label="Cetak invoice service">
              <Printer className="size-4" />
            </Button>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <Section title="Pelanggan">
          <ReadField label="Nama" value={service.pelanggan} />
          <ReadField label="No. WhatsApp" value={service.telepon} />
          <ReadField label="Alamat" value={service.alamat || "-"} />
        </Section>

        <Separator />

        <Section title="Unit">
          <div className="grid grid-cols-2 gap-3">
            <ReadField label="Jenis" value={service.jenisUnit} />
            <ReadField label="Merk" value={service.merk} />
            <ReadField label="Model" value={service.model || "-"} />
            <ReadField label="No. Seri" value={service.nomorSeri || "-"} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Kelengkapan dibawa</p>
            <div className="flex flex-wrap gap-2">
              {PILIHAN_KELENGKAPAN.map((a) => {
                const on = service.kelengkapan.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => controller.toggleKelengkapan(service.id, a)}
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
            <Textarea value={service.keluhan} onChange={(e) => controller.perbaruiInfo(service.id, { keluhan: e.target.value })} className="min-h-20" />
          </div>
          <div className="space-y-2">
            <Label>Hasil Diagnosa Teknisi</Label>
            <Textarea value={service.diagnosa || ""} onChange={(e) => controller.perbaruiInfo(service.id, { diagnosa: e.target.value })} placeholder="Tuliskan hasil pemeriksaan..." className="min-h-20" />
          </div>
          <div className="space-y-2">
            <Label>Teknisi Ditugaskan</Label>
            <Select value={service.teknisi} onValueChange={(v) => controller.perbaruiInfo(service.id, { teknisi: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAFTAR_TEKNISI.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Separator />

        <Section title="Sparepart & Biaya">
          <div className="space-y-2">
            {service.sparepart.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{p.nama} <span className="text-muted-foreground">× {p.jumlah}</span></span>
                <div className="flex items-center gap-3">
                  <span>{rupiah(p.subtotal())}</span>
                  <button type="button" onClick={() => controller.hapusSparepart(service.id, p.id)} aria-label="Hapus" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
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
                    {controller.pilihanSparepart().map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nama} — {rupiah(p.hargaJual)}</SelectItem>
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
                value={service.biayaJasa ? service.biayaJasa.toLocaleString("id-ID") : ""}
                onChange={(e) => controller.perbaruiInfo(service.id, { biayaJasa: Number(e.target.value.replace(/\D/g, "")) || 0 })}
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
            {[...service.riwayat].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] top-0.5 size-3 rounded-full ring-4 ring-card" style={{ backgroundColor: STATUS_META[h.status].color }} />
                <p className="text-sm">{STATUS_META[h.status].label}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(h.pada)}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* sticky footer */}
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card p-4">
        <Button variant="outline" className="w-full">
          <MessageCircle className="size-4 text-success" />
          Kirim Update via WhatsApp
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-success text-white hover:bg-success/90"
            onClick={() => controller.ubahStatus(service.id, "selesai")}
            disabled={service.sudahSelesai()}
          >
            <CheckCircle2 className="size-4" />
            Tandai Selesai
          </Button>
          <Button
            className="bg-amber font-semibold text-primary-900 hover:bg-amber/90"
            onClick={() => controller.ubahStatus(service.id, "diambil")}
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
const EMPTY_SERVICE: FormServiceBaru = {
  pelanggan: "", telepon: "", alamat: "", jenisUnit: "", merk: "", model: "",
  keluhan: "", prioritas: "normal", teknisi: DAFTAR_TEKNISI[0],
};

function AddServiceDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const controller = ServiceController.getInstance();
  const [form, setForm] = useState<FormServiceBaru>(EMPTY_SERVICE);
  const [errors, setErrors] = useState<ErrorService>({});

  function set<K extends keyof FormServiceBaru>(k: K, v: FormServiceBaru[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }
  function submit() {
    const hasil = controller.buatService(form);
    if (!hasil.sukses) {
      setErrors(hasil.errors);
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
            <FormField label="Nama Pelanggan" error={errors.pelanggan}>
              <Input value={form.pelanggan} onChange={(e) => set("pelanggan", e.target.value)} aria-invalid={!!errors.pelanggan} className={cn(errors.pelanggan && "border-destructive")} />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="No. WhatsApp" error={errors.telepon}>
                <Input value={form.telepon} onChange={(e) => set("telepon", e.target.value)} placeholder="08xxxxxxxxxx" aria-invalid={!!errors.telepon} className={cn(errors.telepon && "border-destructive")} />
              </FormField>
              <FormField label="Alamat (opsional)">
                <Input value={form.alamat} onChange={(e) => set("alamat", e.target.value)} />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base">Data Unit</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="Jenis Unit" error={errors.jenisUnit}>
                <Select value={form.jenisUnit} onValueChange={(v) => set("jenisUnit", v)}>
                  <SelectTrigger aria-invalid={!!errors.jenisUnit} className={cn("w-full", errors.jenisUnit && "border-destructive")}>
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
              <FormField label="Merk" error={errors.merk}>
                <Input value={form.merk} onChange={(e) => set("merk", e.target.value)} placeholder="ASUS, HP..." aria-invalid={!!errors.merk} className={cn(errors.merk && "border-destructive")} />
              </FormField>
              <FormField label="Model (opsional)">
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Prioritas">
                <Select value={form.prioritas} onValueChange={(v) => set("prioritas", v as PrioritasService)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Teknisi">
                <Select value={form.teknisi} onValueChange={(v) => set("teknisi", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAFTAR_TEKNISI.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base">Keluhan Awal</h3>
            <FormField label="Keluhan Pelanggan" error={errors.keluhan}>
              <Textarea value={form.keluhan} onChange={(e) => set("keluhan", e.target.value)} placeholder="Jelaskan keluhan/kerusakan unit..." aria-invalid={!!errors.keluhan} className={cn("min-h-24", errors.keluhan && "border-destructive")} />
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
