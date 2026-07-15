import { useState } from "react";
import {
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  Laptop,
  Cpu,
  Cable,
  Package,
  X,
  UploadCloud,
  Wand2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
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
  SheetDescription,
} from "./ui/sheet";
import { cn } from "./ui/utils";
import type { Product, ProductCategory, StockStatus } from "../../domain/entities/Product";
import {
  ProductController,
  type ProductFormErrors,
  type ProductForm,
} from "../../domain/controllers/ProductController";
import { useController } from "../hooks/use-controller";
import { pickImage } from "../image";
import { toast } from "sonner";

// ---------- metadata tampilan ----------
const CATEGORY_META: Record<ProductCategory, { label: string; icon: LucideIcon; tint: string }> = {
  laptop: { label: "Laptop", icon: Laptop, tint: "bg-primary-100 text-primary-700" },
  pc: { label: "PC & Komponen", icon: Cpu, tint: "bg-primary-100 text-primary-500" },
  aksesoris: { label: "Aksesoris", icon: Cable, tint: "bg-amber-100 text-amber" },
  sparepart: { label: "Sparepart", icon: Cpu, tint: "bg-success/15 text-success" },
  lainnya: { label: "Lainnya", icon: Package, tint: "bg-muted text-muted-foreground" },
};

const STOCK_BADGE: Record<StockStatus, string> = {
  aman: "bg-success/15 text-success",
  menipis: "bg-amber-100 text-amber",
  habis: "bg-destructive/10 text-destructive",
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const PAGE_SIZE = 8;

/**
 * DataBarang — boundary class katalog barang.
 * Seluruh data & aturan bisnis dipegang ProductController; komponen ini
 * hanya menyimpan state tampilan (pencarian, halaman, seleksi, drawer).
 */
export function DataBarang() {
  const controller = ProductController.getInstance();
  useController(controller);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | ProductCategory>("all");
  const [stockFilter, setStockFilter] = useState<"all" | StockStatus>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = controller.list({
    keyword: search,
    category: catFilter,
    stockStatus: stockFilter,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageItems.map((product) => product.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function deleteOne(id: string) {
    controller.remove(id);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }
  function deleteSelected() {
    controller.removeMany([...selected]);
    setSelected(new Set());
  }
  function bulkUpdateCategory(category: ProductCategory) {
    controller.setCategoryMany([...selected], category);
    setSelected(new Set());
  }
  function openAdd() { setEditing(null); setDrawerOpen(true); }
  function openEdit(product: Product) { setEditing(product); setDrawerOpen(true); }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Data Barang</h1>
          <p className="text-sm text-muted-foreground">Kelola katalog laptop, komponen, dan sparepart toko.</p>
        </div>
        <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={openAdd}>
          <Plus className="size-4" />
          Tambah Barang
        </Button>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama atau kode barang..." className="bg-card pl-9" />
        </div>
        <Select value={catFilter} onValueChange={(v) => { setCatFilter(v as typeof catFilter); setPage(1); }}>
          <SelectTrigger className="w-44 bg-card"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="pc">PC & Komponen</SelectItem>
            <SelectItem value="aksesoris">Aksesoris</SelectItem>
            <SelectItem value="sparepart">Sparepart</SelectItem>
            <SelectItem value="lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v as typeof stockFilter); setPage(1); }}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Status Stok" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Stok</SelectItem>
            <SelectItem value="aman">Stok Aman</SelectItem>
            <SelectItem value="menipis">Stok Menipis</SelectItem>
            <SelectItem value="habis">Stok Habis</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-500/40 bg-primary-100 px-4 py-2.5">
          <span className="text-sm text-primary-700">{selected.size} dipilih</span>
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => bulkUpdateCategory(v as ProductCategory)}>
              <SelectTrigger className="h-9 w-44 bg-card"><SelectValue placeholder="Ubah Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="pc">PC & Komponen</SelectItem>
                <SelectItem value="aksesoris">Aksesoris</SelectItem>
                <SelectItem value="sparepart">Sparepart</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="size-4" />
              Hapus Terpilih
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSelected(new Set())}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allPageSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" /></TableHead>
              <TableHead className="w-14">Foto</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">Tidak ada barang yang cocok.</TableCell>
              </TableRow>
            ) : (
              pageItems.map((product) => {
                const meta = CATEGORY_META[product.category];
                const Icon = meta.icon;
                const status = product.stockStatus();
                return (
                  <TableRow key={product.id} className="h-[52px]" data-state={selected.has(product.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleOne(product.id)} aria-label={`Pilih ${product.name}`} /></TableCell>
                    <TableCell>
                      {product.image ? (
                        <img src={product.image} alt="" className="size-9 rounded-lg border border-border object-cover" />
                      ) : (
                        <div className={cn("flex size-9 items-center justify-center rounded-lg", meta.tint)}><Icon className="size-4" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell><Badge className={cn("border-0", meta.tint)}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground">{rupiah(product.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{rupiah(product.sellPrice)}</TableCell>
                    <TableCell className="text-center"><Badge className={cn("border-0", STOCK_BADGE[status])}>{product.stock === 0 ? "Habis" : product.stock}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{product.supplier}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <IconBtn icon={Pencil} label="Edit" onClick={() => openEdit(product)} />
                        <IconBtn icon={Trash2} label="Hapus" danger onClick={() => deleteOne(product.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">Menampilkan {pageItems.length} dari {filtered.length} barang</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
              Sebelumnya
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === safePage ? "default" : "outline"} size="sm" className={cn("w-9", p === safePage && "bg-primary-700 text-white hover:bg-primary-500")} onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Berikutnya
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <ItemDrawer open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />
    </div>
  );
}

function IconBtn({ icon: Icon, label, danger, onClick }: { icon: LucideIcon; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button" aria-label={label} onClick={onClick}
      className={cn("flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors", danger ? "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" : "hover:border-primary-500 hover:bg-muted hover:text-foreground")}
    >
      <Icon className="size-4" />
    </button>
  );
}

// ---------- drawer ----------
const EMPTY_FORM: ProductForm = { name: "", code: "", category: "", supplier: "", purchasePrice: "", sellPrice: "", stock: "", minStock: "", specification: "", image: "" };

function ItemDrawer({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (v: boolean) => void; editing: Product | null }) {
  const controller = ProductController.getInstance();
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = editing?.id ?? "__new__";
  if (open && lastKey !== key) {
    setForm(editing ? {
      name: editing.name, code: editing.code, category: editing.category, supplier: editing.supplier,
      purchasePrice: String(editing.purchasePrice), sellPrice: String(editing.sellPrice),
      stock: String(editing.stock), minStock: String(editing.minStock), specification: editing.specification || "",
      image: editing.image || "",
    } : EMPTY_FORM);
    setErrors({});
    setLastKey(key);
  }
  if (!open && lastKey !== null) setLastKey(null);

  function set<K extends keyof ProductForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function choosePhoto() {
    try {
      const image = await pickImage({ maxDim: 800, quality: 0.82 });
      if (image) set("image", image);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat foto.");
    }
  }
  function setPrice(k: "purchasePrice" | "sellPrice", raw: string) { set(k, raw.replace(/\D/g, "")); }
  const fmt = (d: string) => (d ? Number(d).toLocaleString("id-ID") : "");

  function generateCode() {
    set("code", controller.generateCode(form.category));
  }
  function submit() {
    // validasi & penyimpanan sepenuhnya dilakukan controller
    const result = controller.save(form, editing?.id);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle>{editing ? "Edit Barang" : "Tambah Barang"}</SheetTitle>
          <SheetDescription>{editing ? "Perbarui informasi barang." : "Lengkapi informasi barang baru."}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* photo upload */}
          {form.image ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              <img src={form.image} alt="Foto barang" className="h-40 w-full object-contain bg-muted" />
              <div className="absolute right-2 top-2 flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={choosePhoto}>Ganti</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => set("image", "")} aria-label="Hapus foto">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={choosePhoto} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-7 text-muted-foreground transition-colors hover:border-primary-500 hover:bg-muted">
              <UploadCloud className="size-6" />
              <span className="text-sm">Klik untuk pilih foto barang</span>
              <span className="text-xs">PNG, JPG hingga 8MB</span>
            </button>
          )}

          <Field label="Nama Barang" error={errors.name}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Laptop ASUS Vivobook 14" aria-invalid={!!errors.name} className={cn(errors.name && "border-destructive")} />
          </Field>

          <Field label="Kode Barang / SKU" error={errors.code}>
            <div className="flex gap-2">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="LP-001" aria-invalid={!!errors.code} className={cn("font-mono", errors.code && "border-destructive")} />
              <Button type="button" variant="outline" onClick={generateCode} className="shrink-0">
                <Wand2 className="size-4" />
                Generate
              </Button>
            </div>
          </Field>

          <Field label="Kategori" error={errors.category}>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger aria-invalid={!!errors.category} className={cn("w-full", errors.category && "border-destructive")}>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="pc">PC & Komponen</SelectItem>
                <SelectItem value="aksesoris">Aksesoris</SelectItem>
                <SelectItem value="sparepart">Sparepart</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
                <Separator className="my-1" />
                <div className="px-2 py-1.5 text-sm text-primary-700">+ Tambah Kategori</div>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Supplier" error={errors.supplier}>
            <Select value={form.supplier} onValueChange={(v) => set("supplier", v)}>
              <SelectTrigger aria-invalid={!!errors.supplier} className={cn("w-full", errors.supplier && "border-destructive")}>
                <SelectValue placeholder="Cari & pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {controller.supplierNames().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Harga Beli" error={errors.purchasePrice}>
              <PriceInput value={fmt(form.purchasePrice)} onChange={(v) => setPrice("purchasePrice", v)} invalid={!!errors.purchasePrice} />
            </Field>
            <Field label="Harga Jual" error={errors.sellPrice}>
              <PriceInput value={fmt(form.sellPrice)} onChange={(v) => setPrice("sellPrice", v)} invalid={!!errors.sellPrice} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stok Awal" error={errors.stock}>
              <Input type="number" min={0} value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" aria-invalid={!!errors.stock} className={cn(errors.stock && "border-destructive")} />
            </Field>
            <Field label="Stok Minimum" error={errors.minStock}>
              <Input type="number" min={0} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} placeholder="0" aria-invalid={!!errors.minStock} className={cn(errors.minStock && "border-destructive")} />
            </Field>
          </div>

          <Field label="Spesifikasi">
            <Textarea value={form.specification} onChange={(e) => set("specification", e.target.value)} placeholder="Untuk laptop: CPU / RAM / Storage / GPU" className="min-h-20" />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={submit}>Simpan Barang</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PriceInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <Input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" aria-invalid={invalid} className={cn("pl-9", invalid && "border-destructive")} />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
