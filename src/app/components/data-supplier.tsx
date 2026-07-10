import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
import type { Supplier } from "../../domain/entities/Supplier";
import {
  SupplierController,
  type ErrorSupplier,
  type FormSupplier,
} from "../../domain/controllers/SupplierController";
import { useController } from "../hooks/use-controller";

const EMPTY: FormSupplier = { nama: "", kontakPerson: "", telepon: "", alamat: "", catatan: "" };

/**
 * DataSupplier — boundary class data pemasok.
 * CRUD & validasi dilakukan SupplierController.
 */
export function DataSupplier() {
  const controller = SupplierController.getInstance();
  useController(controller);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const filtered = controller.daftar(search);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Data Supplier</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar pemasok barang dan informasi kontaknya.
          </p>
        </div>
        <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={openAdd}>
          <Plus className="size-4" />
          Tambah Supplier
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama supplier, kontak, atau nomor telepon..."
          className="bg-input-background pl-9"
        />
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Kontak Person</TableHead>
              <TableHead>No. Telepon / WhatsApp</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-center">Barang Disuplai</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Tidak ada supplier yang cocok.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{s.kontakPerson}</TableCell>
                  <TableCell className="text-muted-foreground">{s.telepon}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-2">{s.alamat}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary transition-colors hover:bg-primary/20"
                        >
                          <Package className="size-3.5" />
                          {s.jumlahBarang()} barang
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="center" className="w-64 p-0">
                        <div className="border-b border-border px-3 py-2">
                          <p className="text-sm">Barang dari {s.nama}</p>
                        </div>
                        {s.jumlahBarang() === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Belum ada barang.
                          </p>
                        ) : (
                          <ul className="max-h-56 overflow-y-auto py-1">
                            {s.barangDisuplai.map((it) => (
                              <li key={it} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                <Package className="size-3.5 text-muted-foreground" />
                                {it}
                              </li>
                            ))}
                          </ul>
                        )}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(s)} />
                      <IconButton icon={Trash2} label="Hapus" danger onClick={() => controller.hapus(s.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function IconButton({
  icon: Icon, label, danger, onClick,
}: { icon: LucideIcon; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function SupplierDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Supplier | null;
}) {
  const controller = SupplierController.getInstance();
  const [form, setForm] = useState<FormSupplier>(EMPTY);
  const [errors, setErrors] = useState<ErrorSupplier>({});
  const [lastId, setLastId] = useState<string | null>(null);

  // sinkronkan form saat membuka supplier lain (atau tambah baru)
  const currentId = editing?.id ?? "__new__";
  if (open && lastId !== currentId) {
    setForm(
      editing
        ? { nama: editing.nama, kontakPerson: editing.kontakPerson, telepon: editing.telepon, alamat: editing.alamat, catatan: editing.catatan || "" }
        : EMPTY,
    );
    setErrors({});
    setLastId(currentId);
  }
  if (!open && lastId !== null) setLastId(null);

  function set<K extends keyof FormSupplier>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  function submit() {
    const hasil = controller.simpan(form, editing?.id);
    if (!hasil.sukses) {
      setErrors(hasil.errors);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui informasi supplier." : "Lengkapi data pemasok baru."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Nama Supplier" error={errors.nama}>
            <Input value={form.nama} onChange={(e) => set("nama", e.target.value)}
              placeholder="Contoh: PT Sumber Komputer"
              aria-invalid={!!errors.nama}
              className={cn("bg-input-background", errors.nama && "border-destructive")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kontak Person" error={errors.kontakPerson}>
              <Input value={form.kontakPerson} onChange={(e) => set("kontakPerson", e.target.value)}
                placeholder="Nama PIC"
                aria-invalid={!!errors.kontakPerson}
                className={cn("bg-input-background", errors.kontakPerson && "border-destructive")} />
            </Field>
            <Field label="No. Telepon / WhatsApp" error={errors.telepon}>
              <Input value={form.telepon} onChange={(e) => set("telepon", e.target.value)}
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!errors.telepon}
                className={cn("bg-input-background", errors.telepon && "border-destructive")} />
            </Field>
          </div>

          <Field label="Alamat" error={errors.alamat}>
            <Textarea value={form.alamat} onChange={(e) => set("alamat", e.target.value)}
              placeholder="Alamat lengkap supplier..."
              aria-invalid={!!errors.alamat}
              className={cn("min-h-20 bg-input-background", errors.alamat && "border-destructive")} />
          </Field>

          <Field label="Catatan (opsional)">
            <Textarea value={form.catatan} onChange={(e) => set("catatan", e.target.value)}
              placeholder="Catatan tambahan, syarat pembayaran, dll."
              className="min-h-20 bg-input-background" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={submit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
