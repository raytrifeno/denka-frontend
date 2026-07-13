import { useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus,
  Eye,
  CalendarIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "./ui/utils";
import { LABEL_REASON, type StockOutReason } from "../../domain/entities/StockMovement";
import {
  StockController,
  type StockErrors,
  type StockOutForm,
  type StockInForm,
} from "../../domain/controllers/StockController";
import { useController } from "../hooks/use-controller";

const REASON_CLASS: Record<StockOutReason, string> = {
  rusak: "bg-destructive/10 text-destructive",
  retur: "bg-warning/15 text-warning",
  internal: "bg-info/15 text-info",
  lainnya: "bg-muted text-muted-foreground",
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: Date) => format(d, "dd MMM yyyy", { locale: idLocale });

type Tab = "masuk" | "keluar";

/**
 * StokBarang — boundary class mutasi stok.
 * Pencatatan masuk/keluar (termasuk update stok Barang) dilakukan StockController.
 */
export function StokBarang() {
  const controller = StockController.getInstance();
  useController(controller);

  const [tab, setTab] = useState<Tab>("masuk");
  const [inOpen, setInOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);

  const inMoves = controller.listStockIn();
  const outMoves = controller.listStockOut();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Stok Barang</h1>
          <p className="text-sm text-muted-foreground">
            Pencatatan mutasi stok — barang masuk dari supplier dan barang keluar selain penjualan.
          </p>
        </div>
        {tab === "masuk" ? (
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={() => setInOpen(true)}>
            <Plus className="size-4" />
            Catat Barang Masuk
          </Button>
        ) : (
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={() => setOutOpen(true)}>
            <Plus className="size-4" />
            Catat Barang Keluar
          </Button>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border">
        <TabButton
          active={tab === "masuk"}
          onClick={() => setTab("masuk")}
          icon={ArrowDownToLine}
          label="Barang Masuk"
        />
        <TabButton
          active={tab === "keluar"}
          onClick={() => setTab("keluar")}
          icon={ArrowUpFromLine}
          label="Barang Keluar"
        />
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {tab === "masuk" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Jumlah Masuk</TableHead>
                <TableHead className="text-right">Harga Beli Satuan</TableHead>
                <TableHead className="text-right">Total Biaya</TableHead>
                <TableHead>Dicatat Oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inMoves.length === 0 ? (
                <EmptyRow cols={8} text="Belum ada catatan barang masuk." />
              ) : (
                inMoves.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(m.date)}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.supplier}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-success/15 text-success">+{m.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{rupiah(m.unitPrice)}</TableCell>
                    <TableCell className="text-right">{rupiah(m.totalCost())}</TableCell>
                    <TableCell className="text-muted-foreground">{m.recordedBy}</TableCell>
                    <TableCell className="text-right">
                      <DetailButton />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead className="text-center">Jumlah Keluar</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Dicatat Oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outMoves.length === 0 ? (
                <EmptyRow cols={7} text="Belum ada catatan barang keluar." />
              ) : (
                outMoves.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(m.date)}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-destructive/10 text-destructive">-{m.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", REASON_CLASS[m.reason])}>{m.reasonLabel()}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{m.note || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.recordedBy}</TableCell>
                    <TableCell className="text-right">
                      <DetailButton />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <BarangMasukDialog open={inOpen} onOpenChange={setInOpen} />
      <BarangKeluarDialog open={outOpen} onOpenChange={setOutOpen} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ArrowDownToLine;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors",
        active
          ? "border-amber font-semibold text-primary-700"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function DetailButton() {
  return (
    <button
      type="button"
      aria-label="Lihat detail"
      className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Eye className="size-4" />
    </button>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-12 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

// ---------- shared field helper ----------
function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ProductSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const controller = StockController.getInstance();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-invalid={error}
        className={cn("w-full bg-input-background", error && "border-destructive")}
      >
        <SelectValue placeholder="Cari & pilih barang" />
      </SelectTrigger>
      <SelectContent>
        {controller.productOptions().map((p) => (
          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DatePickerField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-input-background font-normal"
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {fmtDate(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------- Barang Masuk dialog ----------
function BarangMasukDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const controller = StockController.getInstance();
  const [product, setProduct] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<StockErrors>({});

  function reset() {
    setProduct(""); setSupplier(""); setQty(""); setPrice("");
    setDate(new Date()); setRef(""); setNote(""); setErrors({});
  }

  // otomatis isi harga beli terakhir dari controller saat barang dipilih
  function pickProduct(name: string) {
    setProduct(name);
    setErrors((e) => ({ ...e, productName: "" }));
    const lastPrice = controller.lastPurchasePrice(name);
    if (lastPrice !== null && !price) setPrice(String(lastPrice));
  }

  const fmt = (digits: string) => (digits ? Number(digits).toLocaleString("id-ID") : "");

  function submit() {
    const form: StockInForm = {
      productName: product,
      supplier,
      quantity: qty,
      unitPrice: price,
      date: date,
      invoiceNo: ref,
      note: note,
    };
    const result = controller.recordStockIn(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    reset();
    onOpenChange(false);
  }

  function handleOpen(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Barang Masuk</DialogTitle>
          <DialogDescription>Catat penerimaan barang baru dari supplier.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Pilih Barang" error={errors.productName}>
            <ProductSelect value={product} onChange={pickProduct} error={!!errors.productName} />
            <button type="button" className="text-xs text-primary hover:underline">
              Barang belum ada? Tambah baru
            </button>
          </Field>

          <Field label="Pilih Supplier" error={errors.supplier}>
            <Select value={supplier} onValueChange={(v) => { setSupplier(v); setErrors((e) => ({ ...e, supplier: "" })); }}>
              <SelectTrigger
                aria-invalid={!!errors.supplier}
                className={cn("w-full bg-input-background", errors.supplier && "border-destructive")}
              >
                <SelectValue placeholder="Cari & pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {controller.supplierNames().map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Jumlah Masuk" error={errors.quantity}>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => { setQty(e.target.value); setErrors((x) => ({ ...x, quantity: "" })); }}
                placeholder="0"
                aria-invalid={!!errors.quantity}
                className={cn("bg-input-background", errors.quantity && "border-destructive")}
              />
            </Field>
            <Field label="Harga Beli Satuan" error={errors.unitPrice}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  inputMode="numeric"
                  value={fmt(price)}
                  onChange={(e) => { setPrice(e.target.value.replace(/\D/g, "")); setErrors((x) => ({ ...x, unitPrice: "" })); }}
                  placeholder="0"
                  aria-invalid={!!errors.unitPrice}
                  className={cn("bg-input-background pl-9", errors.unitPrice && "border-destructive")}
                />
              </div>
            </Field>
          </div>

          <Field label="Tanggal Masuk">
            <DatePickerField value={date} onChange={setDate} />
          </Field>

          <Field label="No. Faktur / Referensi (opsional)">
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Contoh: FK-2026-0451"
              className="bg-input-background"
            />
          </Field>

          <Field label="Catatan (opsional)">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan tambahan..."
              className="min-h-20 bg-input-background"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Batal</Button>
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={submit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Barang Keluar dialog ----------
function BarangKeluarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const controller = StockController.getInstance();
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<StockOutReason | "">("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<StockErrors>({});

  const available = product ? controller.availableStock(product) : null;

  function reset() {
    setProduct(""); setQty(""); setReason(""); setNote(""); setErrors({});
  }

  function submit() {
    const form: StockOutForm = {
      productName: product,
      quantity: qty,
      reason: reason,
      note: note,
    };
    const result = controller.recordStockOut(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    reset();
    onOpenChange(false);
  }

  function handleOpen(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Barang Keluar</DialogTitle>
          <DialogDescription>
            Catat barang keluar selain penjualan (rusak, retur, pemakaian internal).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Pilih Barang" error={errors.productName}>
            <ProductSelect
              value={product}
              onChange={(v) => { setProduct(v); setErrors((e) => ({ ...e, productName: "", quantity: "" })); }}
              error={!!errors.productName}
            />
          </Field>

          <Field
            label="Jumlah Keluar"
            error={errors.quantity}
            hint={available !== null ? `Stok tersedia: ${available}` : undefined}
          >
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => { setQty(e.target.value); setErrors((x) => ({ ...x, quantity: "" })); }}
              placeholder="0"
              aria-invalid={!!errors.quantity}
              className={cn("bg-input-background", errors.quantity && "border-destructive")}
            />
          </Field>

          <Field label="Alasan" error={errors.reason}>
            <Select value={reason} onValueChange={(v) => { setReason(v as StockOutReason); setErrors((e) => ({ ...e, reason: "" })); }}>
              <SelectTrigger
                aria-invalid={!!errors.reason}
                className={cn("w-full bg-input-background", errors.reason && "border-destructive")}
              >
                <SelectValue placeholder="Pilih alasan" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LABEL_REASON) as StockOutReason[]).map((reason) => (
                  <SelectItem key={reason} value={reason}>{LABEL_REASON[reason]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Keterangan">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan detail barang keluar..."
              className="min-h-20 bg-input-background"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Batal</Button>
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={submit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
