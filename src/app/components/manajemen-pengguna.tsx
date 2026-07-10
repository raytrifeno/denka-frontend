import { useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  UploadCloud,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Avatar, AvatarFallback } from "./ui/avatar";
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
import { cn } from "./ui/utils";
import type { Pengguna, RolePengguna } from "../../domain/entities/Pengguna";
import {
  PenggunaController,
  type ErrorPengguna,
  type FormPengguna,
} from "../../domain/controllers/PenggunaController";
import { useController } from "../hooks/use-controller";

const ROLE_BADGE: Record<RolePengguna, { label: string; className: string }> = {
  pemilik: { label: "Pemilik", className: "bg-[#7c3aed]/15 text-[#7c3aed]" },
  admin: { label: "Admin", className: "bg-info/15 text-info" },
};

const fmtLogin = (d: Date | null) =>
  d ? format(d, "dd MMM yyyy, HH:mm", { locale: idLocale }) : "Belum pernah";

/**
 * ManajemenPengguna — boundary class akun pengguna (khusus Pemilik).
 * Aturan bisnis (tidak boleh menghapus akun sendiri, username unik, dsb.)
 * ditegakkan PenggunaController.
 */
export function ManajemenPengguna() {
  const controller = PenggunaController.getInstance();
  useController(controller);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pengguna | null>(null);

  const users = controller.daftar();

  function openAdd() { setEditing(null); setDialogOpen(true); }
  function openEdit(u: Pengguna) { setEditing(u); setDialogOpen(true); }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Manajemen Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun dan hak akses pengguna sistem (khusus Pemilik).
          </p>
        </div>
        <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={openAdd}>
          <Plus className="size-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Avatar</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Username / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Terakhir Login</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isSelf = controller.adalahPenggunaAktif(u.id);
              const meta = ROLE_BADGE[u.role];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {u.inisial()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    {u.nama}
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{u.username}</span>
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0", meta.className)}>{meta.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.aktif}
                        disabled={isSelf}
                        onCheckedChange={() => controller.toggleAktif(u.id)}
                        aria-label={`Status ${u.nama}`}
                      />
                      <span className={cn("text-sm", u.aktif ? "text-success" : "text-muted-foreground")}>
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtLogin(u.terakhirLogin)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(u)} />
                      <IconButton
                        icon={Trash2}
                        label={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus"}
                        danger
                        disabled={isSelf}
                        onClick={() => controller.hapus(u.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}

function IconButton({
  icon: Icon, label, danger, disabled, onClick,
}: { icon: LucideIcon; label: string; danger?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : danger
            ? "hover:bg-destructive/10 hover:text-destructive"
            : "hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

// ---------- dialog ----------
const EMPTY: FormPengguna = {
  nama: "", username: "", email: "", password: "", role: "admin", aktif: true,
};

const initialsOf = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function UserDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Pengguna | null;
}) {
  const controller = PenggunaController.getInstance();
  const [form, setForm] = useState<FormPengguna>(EMPTY);
  const [errors, setErrors] = useState<ErrorPengguna>({});
  const [showPass, setShowPass] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const currentId = editing?.id ?? "__new__";
  if (open && lastId !== currentId) {
    setForm(
      editing
        ? { nama: editing.nama, username: editing.username, email: editing.email, password: "", role: editing.role, aktif: editing.aktif }
        : EMPTY,
    );
    setErrors({});
    setShowPass(false);
    setLastId(currentId);
  }
  if (!open && lastId !== null) setLastId(null);

  function set<K extends keyof FormPengguna>(k: K, v: FormPengguna[K]) {
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
          <DialogTitle>{editing ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui informasi dan hak akses pengguna." : "Buat akun pengguna baru."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* avatar upload */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {form.nama ? initialsOf(form.nama) : "?"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <UploadCloud className="size-5" />
              <span className="text-xs">Upload foto profil (opsional)</span>
            </button>
          </div>

          <Field label="Nama Lengkap" error={errors.nama}>
            <Input value={form.nama} onChange={(e) => set("nama", e.target.value)}
              aria-invalid={!!errors.nama}
              className={cn("bg-input-background", errors.nama && "border-destructive")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Username" error={errors.username}>
              <Input value={form.username} onChange={(e) => set("username", e.target.value)}
                aria-invalid={!!errors.username}
                className={cn("bg-input-background", errors.username && "border-destructive")} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="nama@denkacomputer.id"
                aria-invalid={!!errors.email}
                className={cn("bg-input-background", errors.email && "border-destructive")} />
            </Field>
          </div>

          <Field
            label="Password"
            error={errors.password}
            hint={editing ? "Kosongkan jika tidak ingin mengubah password." : undefined}
          >
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={editing ? "••••••••" : "Masukkan password"}
                aria-invalid={!!errors.password}
                className={cn("bg-input-background pr-9", errors.password && "border-destructive")}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Sembunyikan" : "Tampilkan"}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => set("role", v as RolePengguna)}>
              <SelectTrigger className="w-full bg-input-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pemilik">Pemilik</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm">Status Aktif</p>
              <p className="text-xs text-muted-foreground">
                Pengguna nonaktif tidak dapat masuk ke sistem.
              </p>
            </div>
            <Switch checked={form.aktif} onCheckedChange={(v) => set("aktif", v)} />
          </div>
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
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
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
