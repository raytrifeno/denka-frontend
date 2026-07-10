import { useRef, useState } from "react";
import {
  Store,
  ReceiptText,
  MessageCircle,
  Tags,
  UserCog,
  UploadCloud,
  Save,
  X,
  Eye,
  EyeOff,
  Send,
  Plus,
  DatabaseBackup,
  RotateCcw,
  HardDrive,
  Laptop,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import { AuthController } from "../../domain/controllers/AuthController";
import { PenggunaController } from "../../domain/controllers/PenggunaController";
import { PengaturanController } from "../../domain/controllers/PengaturanController";
import { useController } from "../hooks/use-controller";

type TabId = "toko" | "struk" | "whatsapp" | "kategori" | "akun" | "data";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "toko", label: "Profil Toko", icon: Store },
  { id: "struk", label: "Pengaturan Struk", icon: ReceiptText },
  { id: "whatsapp", label: "Integrasi WhatsApp", icon: MessageCircle },
  { id: "kategori", label: "Kategori Barang", icon: Tags },
  { id: "akun", label: "Akun Saya", icon: UserCog },
  { id: "data", label: "Data & Cadangan", icon: DatabaseBackup },
];

/**
 * Pengaturan — boundary class preferensi aplikasi.
 * Semua nilai dibaca/disimpan lewat PengaturanController (persisten di
 * penyimpanan lokal); tab Akun terhubung ke pengguna yang sedang login.
 */
export function Pengaturan() {
  const [tab, setTab] = useState<TabId>("toko");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h1>Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Atur profil toko, struk, integrasi, dan akun Anda.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col md:flex-row">
          {/* vertical tabs */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-3 md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    tab === t.id
                      ? "bg-primary-100 font-medium text-primary-700"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* content */}
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            {tab === "toko" && <ProfilToko />}
            {tab === "struk" && <PengaturanStruk />}
            {tab === "whatsapp" && <IntegrasiWhatsApp />}
            {tab === "kategori" && <KategoriBarang />}
            {tab === "akun" && <AkunSaya />}
            {tab === "data" && <DataCadangan />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <>
      <Separator className="my-6" />
      <div className="flex justify-end">
        <Button className="bg-primary-700 text-white hover:bg-primary-500" onClick={onSave}>
          <Save className="size-4" />
          Simpan Perubahan
        </Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ---------- 1. Profil Toko ----------
function ProfilToko() {
  const controller = PengaturanController.getInstance();
  const [store, setStore] = useState(controller.toko);

  function save() {
    controller.setToko(store);
    toast.success("Profil toko disimpan");
  }

  return (
    <div>
      <SectionHeader title="Profil Toko" desc="Informasi ini digunakan pada header struk dan invoice." />
      <div className="space-y-4">
        <Field label="Logo Toko">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Laptop className="size-7" />
            </div>
            <button
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <UploadCloud className="size-5" />
              <span className="text-xs">Upload logo (PNG/JPG)</span>
            </button>
          </div>
        </Field>
        <Field label="Nama Toko">
          <Input value={store.nama} onChange={(e) => setStore({ ...store, nama: e.target.value })} className="bg-input-background" />
        </Field>
        <Field label="Alamat">
          <Textarea value={store.alamat} onChange={(e) => setStore({ ...store, alamat: e.target.value })} className="min-h-20 bg-input-background" />
        </Field>
        <Field label="No. Telepon">
          <Input value={store.telepon} onChange={(e) => setStore({ ...store, telepon: e.target.value })} className="bg-input-background" />
        </Field>
      </div>
      <SaveBar onSave={save} />
    </div>
  );
}

// ---------- 2. Pengaturan Struk ----------
function PengaturanStruk() {
  const controller = PengaturanController.getInstance();
  useController(controller);
  const [struk, setStruk] = useState(controller.struk);
  const toko = controller.toko;

  function save() {
    controller.setStruk(struk);
    toast.success("Pengaturan struk disimpan");
  }

  return (
    <div>
      <SectionHeader title="Pengaturan Struk" desc="Sesuaikan tampilan struk transaksi pelanggan." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* options */}
        <div className="space-y-4">
          <ToggleRow
            title="Tampilkan Logo"
            desc="Tampilkan logo toko di bagian atas struk."
            checked={struk.tampilkanLogo}
            onChange={(v) => setStruk({ ...struk, tampilkanLogo: v })}
          />
          <ToggleRow
            title="Tampilkan Alamat"
            desc="Tampilkan alamat & telepon toko pada struk."
            checked={struk.tampilkanAlamat}
            onChange={(v) => setStruk({ ...struk, tampilkanAlamat: v })}
          />
          <Field label="Teks Footer Struk">
            <Input value={struk.footer} onChange={(e) => setStruk({ ...struk, footer: e.target.value })} placeholder="Contoh: Terima kasih telah berbelanja" className="bg-input-background" />
          </Field>
        </div>

        {/* preview */}
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Preview Struk</p>
          <div className="mx-auto max-w-xs rounded-lg border border-dashed border-border bg-background p-4 text-center">
            {struk.tampilkanLogo && (
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Laptop className="size-5" />
              </div>
            )}
            <p className="text-sm">{toko.nama}</p>
            {struk.tampilkanAlamat && (
              <p className="text-xs text-muted-foreground">
                {toko.alamat}<br />{toko.telepon}
              </p>
            )}
            <div className="my-2 border-t border-dashed border-border" />
            <div className="space-y-1 text-left text-xs">
              <div className="flex justify-between"><span>Mouse Wireless</span><span className="tnum">150.000</span></div>
              <div className="flex justify-between"><span>SSD NVMe 512GB</span><span className="tnum">900.000</span></div>
            </div>
            <div className="my-2 border-t border-dashed border-border" />
            <div className="flex justify-between text-sm"><span>Total</span><span className="tnum">Rp 1.050.000</span></div>
            <div className="my-2 border-t border-dashed border-border" />
            <p className="text-xs text-muted-foreground">{struk.footer || "—"}</p>
          </div>
        </div>
      </div>
      <SaveBar onSave={save} />
    </div>
  );
}

function ToggleRow({
  title, desc, checked, onChange,
}: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ---------- 3. Integrasi WhatsApp ----------
const WA_VARS = [
  { token: "{nama_pelanggan}", label: "Nama Pelanggan" },
  { token: "{total_belanja}", label: "Total Belanja" },
  { token: "{no_transaksi}", label: "No. Transaksi" },
  { token: "{nama_toko}", label: "Nama Toko" },
];

function IntegrasiWhatsApp() {
  const controller = PengaturanController.getInstance();
  const awal = controller.whatsapp;
  const [enabled, setEnabled] = useState(awal.aktif);
  const [template, setTemplate] = useState(awal.template);
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertVar(token: string) {
    const el = ref.current;
    if (!el) {
      setTemplate((t) => t + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = template.slice(0, start) + token + template.slice(end);
    setTemplate(next);
    // kembalikan kursor tepat setelah token yang disisipkan
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function save() {
    controller.setWhatsApp({ aktif: enabled, template });
    toast.success("Pengaturan WhatsApp disimpan");
  }

  return (
    <div>
      <SectionHeader title="Integrasi WhatsApp" desc="Kirim struk digital otomatis ke pelanggan via WhatsApp." />
      <div className="space-y-4">
        <ToggleRow
          title="Aktifkan kirim struk otomatis via WhatsApp"
          desc="Struk akan otomatis dikirim setelah transaksi selesai."
          checked={enabled}
          onChange={setEnabled}
        />

        <div className={cn("space-y-3 transition-opacity", !enabled && "pointer-events-none opacity-50")}>
          <Field label="Template Pesan">
            <Textarea
              ref={ref}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-28 bg-input-background"
            />
          </Field>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Klik variabel untuk menyisipkan ke template:
            </p>
            <div className="flex flex-wrap gap-2">
              {WA_VARS.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVar(v.token)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={() => toast.success("Pesan tes berhasil dikirim")}>
            <Send className="size-4" />
            Test Kirim Pesan
          </Button>
        </div>
      </div>
      <SaveBar onSave={save} />
    </div>
  );
}

// ---------- 4. Kategori Barang ----------
function KategoriBarang() {
  const controller = PengaturanController.getInstance();
  useController(controller);
  const [input, setInput] = useState("");

  const inti = ["Laptop", "PC & Komponen", "Aksesoris", "Sparepart", "Lainnya"];
  const tambahan = controller.kategoriTambahan;

  function add() {
    const hasil = controller.tambahKategori(input);
    if (!hasil.sukses) {
      toast.error(hasil.pesan ?? "Gagal menambah kategori");
      return;
    }
    setInput("");
  }

  return (
    <div>
      <SectionHeader title="Kategori Barang" desc="Kelola kategori untuk pengelompokan barang." />
      <div className="space-y-4">
        <Field label="Kategori Inti">
          <div className="flex flex-wrap gap-2">
            {inti.map((c) => (
              <Badge key={c} variant="secondary" className="py-1 px-3">{c}</Badge>
            ))}
          </div>
        </Field>

        <Field label="Kategori Tambahan">
          <div className="flex flex-wrap gap-2">
            {tambahan.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kategori tambahan.</p>
            ) : (
              tambahan.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5">
                  {c}
                  <button
                    type="button"
                    onClick={() => controller.hapusKategori(c)}
                    aria-label={`Hapus ${c}`}
                    className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </Field>

        <Field label="Tambah Kategori Baru">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder="Nama kategori baru"
              className="bg-input-background"
            />
            <Button type="button" variant="outline" onClick={add} className="shrink-0">
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>
        </Field>
      </div>
    </div>
  );
}

// ---------- 5. Akun Saya ----------
function AkunSaya() {
  const auth = AuthController.getInstance();
  const penggunaCtrl = PenggunaController.getInstance();
  useController(auth);

  const pengguna = auth.penggunaAktif;
  const [profile, setProfile] = useState({
    nama: pengguna?.nama ?? "",
    username: pengguna?.username ?? "",
    email: pengguna?.email ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);

  if (!pengguna) return null;

  function save() {
    if (!pengguna) return;
    if (pw.next) {
      if (!pengguna.cekPassword(pw.current)) {
        toast.error("Password saat ini salah");
        return;
      }
      if (pw.next !== pw.confirm) {
        toast.error("Konfirmasi password tidak cocok");
        return;
      }
    }
    const hasil = penggunaCtrl.simpan(
      {
        nama: profile.nama,
        username: profile.username,
        email: profile.email,
        password: pw.next,
        role: pengguna.role,
        aktif: pengguna.aktif,
      },
      pengguna.id,
    );
    if (!hasil.sukses) {
      const pertama = Object.values(hasil.errors)[0];
      toast.error(pertama ?? "Gagal menyimpan profil");
      return;
    }
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Profil berhasil diperbarui");
  }

  return (
    <div>
      <SectionHeader title="Akun Saya" desc="Perbarui informasi profil dan password Anda." />

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {pengguna.inisial()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <UploadCloud className="size-5" />
            <span className="text-xs">Ubah foto profil</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap">
            <Input value={profile.nama} onChange={(e) => setProfile({ ...profile, nama: e.target.value })} className="bg-input-background" />
          </Field>
          <Field label="Username">
            <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="bg-input-background" />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="bg-input-background" />
        </Field>

        <Separator className="my-2" />
        <p className="text-sm">Ubah Password</p>

        <Field label="Password Saat Ini">
          <PasswordInput value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} show={show} setShow={setShow} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password Baru">
            <PasswordInput value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} show={show} setShow={setShow} />
          </Field>
          <Field label="Konfirmasi Password Baru">
            <PasswordInput value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} show={show} setShow={setShow} />
          </Field>
        </div>
      </div>
      <SaveBar onSave={save} />
    </div>
  );
}

function PasswordInput({
  value, onChange, show, setShow,
}: { value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="bg-input-background pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Sembunyikan" : "Tampilkan"}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

// ---------- 6. Data & Cadangan ----------
function DataCadangan() {
  const controller = PengaturanController.getInstance();

  return (
    <div>
      <SectionHeader
        title="Data & Cadangan"
        desc="Seluruh data aplikasi tersimpan otomatis di perangkat ini (localStorage browser)."
      />

      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <HardDrive className="size-4" />
          </span>
          <div>
            <p className="text-sm">Penyimpanan lokal aktif</p>
            <p className="text-xs text-muted-foreground">
              Transaksi, stok, service, pengguna, dan pengaturan disimpan otomatis
              setiap ada perubahan, dan dimuat kembali saat aplikasi dibuka.
              Data tidak dikirim ke server mana pun.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm">Reset data demo</p>
            <p className="text-xs text-muted-foreground">
              Hapus seluruh transaksi, stok, dan service yang Anda buat, lalu
              kembalikan ke data contoh awal. Tindakan ini tidak bisa dibatalkan.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <RotateCcw className="size-4" />
                Reset Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset seluruh data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Semua transaksi, mutasi stok, tiket service, dan perubahan barang
                  yang Anda buat akan dihapus dan diganti data contoh awal.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    controller.resetDataDemo();
                    toast.success("Data dikembalikan ke kondisi awal");
                  }}
                >
                  Ya, Reset Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm">Reset pengaturan</p>
            <p className="text-xs text-muted-foreground">
              Kembalikan profil toko, struk, dan template WhatsApp ke bawaan.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              controller.resetPengaturan();
              toast.success("Pengaturan dikembalikan ke bawaan");
            }}
          >
            <RotateCcw className="size-4" />
            Reset Pengaturan
          </Button>
        </div>
      </div>
    </div>
  );
}
