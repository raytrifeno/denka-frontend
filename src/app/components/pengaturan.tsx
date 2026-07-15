import { useEffect, useRef, useState } from "react";
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
  CloudUpload,
  CloudDownload,
  FileSpreadsheet,
  Loader2,
  QrCode,
  Unplug,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { pickImage } from "../image";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import {
  getWhatsAppStatus,
  logoutWhatsApp,
  sendReceiptWhatsApp,
  startWhatsAppService,
  type WhatsAppState,
} from "../share";
import type { Role } from "../navigation";
import { AuthController } from "../../domain/controllers/AuthController";
import { UserController } from "../../domain/controllers/UserController";
import { SettingsController } from "../../domain/controllers/SettingsController";
import { CloudSync } from "../../domain/sync/CloudSync";
import { exportToExcel } from "../../domain/export/ExcelExport";
import { useController } from "../hooks/use-controller";

type TabId = "toko" | "struk" | "whatsapp" | "kategori" | "akun" | "data";

// Konfigurasi toko & data hanya untuk Pemilik; Admin hanya kelola akunnya.
const TABS: { id: TabId; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { id: "toko", label: "Profil Toko", icon: Store, roles: ["pemilik"] },
  { id: "struk", label: "Pengaturan Struk", icon: ReceiptText, roles: ["pemilik"] },
  { id: "whatsapp", label: "Integrasi WhatsApp", icon: MessageCircle, roles: ["pemilik"] },
  { id: "kategori", label: "Kategori Barang", icon: Tags, roles: ["pemilik"] },
  { id: "akun", label: "Akun Saya", icon: UserCog, roles: ["pemilik", "admin"] },
  { id: "data", label: "Data & Cadangan", icon: DatabaseBackup, roles: ["pemilik"] },
];

/**
 * Pengaturan — boundary class preferensi aplikasi.
 * Semua nilai dibaca/disimpan lewat SettingsController (persisten di
 * penyimpanan lokal); tab Akun terhubung ke pengguna yang sedang login.
 */
export function Pengaturan() {
  const role = AuthController.getInstance().role;
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));
  const [tab, setTab] = useState<TabId>(visibleTabs[0]?.id ?? "akun");

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
            {visibleTabs.map((t) => {
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
            {tab === "toko" && <StoreProfileSection />}
            {tab === "struk" && <ReceiptSection />}
            {tab === "whatsapp" && <WhatsAppSection />}
            {tab === "kategori" && <CategorySection />}
            {tab === "akun" && <AccountSection />}
            {tab === "data" && <BackupSection />}
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
function StoreProfileSection() {
  const controller = SettingsController.getInstance();
  const [store, setStore] = useState(controller.store);

  function save() {
    controller.setStore(store);
    toast.success("Profil toko disimpan");
  }

  async function chooseLogo() {
    try {
      const logo = await pickImage({ maxDim: 256, quality: 0.9, keepAlpha: true });
      if (logo) setStore((s) => ({ ...s, logo }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat logo.");
    }
  }

  return (
    <div>
      <SectionHeader title="Profil Toko" desc="Informasi ini digunakan pada header struk dan invoice." />
      <div className="space-y-4">
        <Field label="Logo Toko">
          <div className="flex items-center gap-4">
            {store.logo ? (
              <img src={store.logo} alt="Logo toko" className="size-16 rounded-xl border border-border object-contain bg-muted" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Laptop className="size-7" />
              </div>
            )}
            <button
              type="button"
              onClick={chooseLogo}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <UploadCloud className="size-5" />
              <span className="text-xs">Upload logo (PNG/JPG)</span>
            </button>
            {store.logo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStore((s) => ({ ...s, logo: undefined }))}>Hapus</Button>
            )}
          </div>
        </Field>
        <Field label="Nama Toko">
          <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="bg-input-background" />
        </Field>
        <Field label="Alamat">
          <Textarea value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className="min-h-20 bg-input-background" />
        </Field>
        <Field label="No. Telepon">
          <Input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} className="bg-input-background" />
        </Field>
      </div>
      <SaveBar onSave={save} />
    </div>
  );
}

// ---------- 2. Pengaturan Struk ----------
function ReceiptSection() {
  const controller = SettingsController.getInstance();
  useController(controller);
  const [receipt, setReceipt] = useState(controller.receipt);
  const store = controller.store;

  function save() {
    controller.setReceipt(receipt);
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
            checked={receipt.showLogo}
            onChange={(v) => setReceipt({ ...receipt, showLogo: v })}
          />
          <ToggleRow
            title="Tampilkan Alamat"
            desc="Tampilkan alamat & telepon toko pada struk."
            checked={receipt.showAddress}
            onChange={(v) => setReceipt({ ...receipt, showAddress: v })}
          />
          <Field label="Teks Footer Struk">
            <Input value={receipt.footer} onChange={(e) => setReceipt({ ...receipt, footer: e.target.value })} placeholder="Contoh: Terima kasih telah berbelanja" className="bg-input-background" />
          </Field>
        </div>

        {/* preview */}
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Preview Struk</p>
          <div className="mx-auto max-w-xs rounded-lg border border-dashed border-border bg-background p-4 text-center">
            {receipt.showLogo && (
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Laptop className="size-5" />
              </div>
            )}
            <p className="text-sm">{store.name}</p>
            {receipt.showAddress && (
              <p className="text-xs text-muted-foreground">
                {store.address}<br />{store.phone}
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
            <p className="text-xs text-muted-foreground">{receipt.footer || "—"}</p>
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

const WA_STATUS_META: Record<WhatsAppState, { label: string; desc: string }> = {
  ready: { label: "Terhubung", desc: "Struk siap dikirim otomatis via WhatsApp." },
  offline: { label: "Belum terhubung", desc: "Klik Hubungkan — layanan dinyalakan otomatis." },
  loading: { label: "Belum terhubung", desc: "Hubungkan untuk mulai mengirim struk." },
  qr: { label: "Menunggu dipindai", desc: "Buka dialog lalu pindai QR dengan HP." },
  authenticated: { label: "Menyambungkan…", desc: "Sedang menyiapkan sesi." },
  disconnected: { label: "Terputus", desc: "Hubungkan ulang untuk melanjutkan." },
  auth_failure: { label: "Gagal autentikasi", desc: "Coba hubungkan lagi." },
};

function WhatsAppSection() {
  const controller = SettingsController.getInstance();
  const initial = controller.whatsapp;
  const [enabled, setEnabled] = useState(initial.enabled);
  const [template, setTemplate] = useState(initial.template);
  const [serverUrl, setServerUrl] = useState(initial.serverUrl ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  const [status, setStatus] = useState<{ state: WhatsAppState; qr: string | null }>({
    state: "loading",
    qr: null,
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const connected = status.state === "ready";

  // Hubungkan = nyalakan layanan lalu tunggu QR-nya. Tanpa terminal.
  async function connect() {
    setQrOpen(true);
    setStartError(null);
    setStarting(true);
    try {
      await startWhatsAppService();
      setStatus({ state: "loading", qr: null });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Gagal menyalakan layanan WhatsApp.");
    } finally {
      setStarting(false);
    }
  }

  // Polling status layanan — lebih cepat saat dialog QR terbuka.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const s = await getWhatsAppStatus();
      if (alive) setStatus(s);
    };
    tick();
    const id = window.setInterval(tick, qrOpen ? 2000 : 8000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [qrOpen]);

  // Tutup dialog otomatis begitu tersambung.
  useEffect(() => {
    if (connected && qrOpen) {
      setQrOpen(false);
      toast.success("WhatsApp terhubung.");
    }
  }, [connected, qrOpen]);

  async function disconnect() {
    await logoutWhatsApp();
    setStatus({ state: "loading", qr: null });
    toast.success("WhatsApp diputuskan.");
  }

  async function sendTest() {
    const phone = controller.store.phone;
    if (!phone) {
      toast.error("Isi No. Telepon toko di Profil Toko dulu.");
      return;
    }
    setTesting(true);
    try {
      await sendReceiptWhatsApp(phone, `Tes koneksi WhatsApp dari ${controller.store.name || "Denka"}.`);
      toast.success(`Pesan tes terkirim ke ${phone}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim pesan tes.");
    } finally {
      setTesting(false);
    }
  }

  const meta = WA_STATUS_META[status.state];

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
    controller.setWhatsApp({ enabled, template, serverUrl: serverUrl.trim() });
    toast.success("Pengaturan WhatsApp disimpan");
  }

  return (
    <div>
      <SectionHeader title="Integrasi WhatsApp" desc="Hubungkan akun WhatsApp untuk mengirim struk digital ke pelanggan." />
      <div className="space-y-4">
        {/* Koneksi WhatsApp */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              <MessageCircle className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.desc}</p>
            </div>
          </div>
          {connected ? (
            <Button variant="outline" size="sm" className="shrink-0" onClick={disconnect}>
              <Unplug className="size-4" />
              Putuskan
            </Button>
          ) : (
            <Button
              size="sm"
              className="shrink-0 bg-primary-700 text-white hover:bg-primary-500"
              onClick={connect}
            >
              <QrCode className="size-4" />
              Hubungkan
            </Button>
          )}
        </div>

        <Field label="URL Layanan WhatsApp">
          <Input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:3100"
            className="bg-input-background"
          />
          <p className="text-xs text-muted-foreground">
            Kosongkan untuk bawaan. Di HP, isi IP LAN PC yang menjalankan layanan
            (contoh <code>http://192.168.1.10:3100</code>), lalu Simpan.
          </p>
        </Field>

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

          <Button variant="outline" onClick={sendTest} disabled={testing || !connected}>
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Test Kirim Pesan
          </Button>
          {!connected && (
            <p className="text-xs text-muted-foreground">
              Hubungkan WhatsApp dulu untuk mengirim pesan.
            </p>
          )}
        </div>
      </div>
      <SaveBar onSave={save} />

      {/* Dialog QR login WhatsApp */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hubungkan WhatsApp</DialogTitle>
            <DialogDescription>
              Di HP: WhatsApp → Perangkat Tertaut → Tautkan Perangkat, lalu pindai kode di bawah.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-2">
            {startError ? (
              <div className="flex flex-col items-center gap-3 px-2 text-center text-sm text-destructive">
                <AlertCircle className="size-8" />
                <p>{startError}</p>
                <Button variant="outline" size="sm" onClick={connect}>
                  Coba lagi
                </Button>
              </div>
            ) : starting || status.state === "offline" ? (
              <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <Loader2 className="size-8 animate-spin" />
                Menyalakan layanan WhatsApp…
                <span className="text-xs">Saat pertama kali, ini bisa memakan waktu sebentar.</span>
              </div>
            ) : status.state === "auth_failure" ? (
              <div className="text-center text-sm text-destructive">
                <AlertCircle className="mx-auto mb-2 size-8" />
                Gagal autentikasi. Tutup lalu coba lagi.
              </div>
            ) : status.state === "qr" && status.qr ? (
              <>
                <img
                  src={status.qr}
                  alt="Kode QR WhatsApp"
                  className="size-64 rounded-lg border border-border"
                />
                <p className="text-xs text-muted-foreground">Menunggu dipindai…</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-8 animate-spin" />
                Menyiapkan koneksi…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- 4. Kategori Barang ----------
function CategorySection() {
  const controller = SettingsController.getInstance();
  useController(controller);
  const [input, setInput] = useState("");

  const coreCategories = ["Laptop", "PC & Komponen", "Aksesoris", "Sparepart", "Lainnya"];
  const extras = controller.extraCategories;

  function add() {
    const result = controller.addCategory(input);
    if (!result.success) {
      toast.error(result.message ?? "Gagal menambah kategori");
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
            {coreCategories.map((c) => (
              <Badge key={c} variant="secondary" className="py-1 px-3">{c}</Badge>
            ))}
          </div>
        </Field>

        <Field label="Kategori Tambahan">
          <div className="flex flex-wrap gap-2">
            {extras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kategori tambahan.</p>
            ) : (
              extras.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5">
                  {c}
                  <button
                    type="button"
                    onClick={() => controller.removeCategory(c)}
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
function AccountSection() {
  const auth = AuthController.getInstance();
  const userCtrl = UserController.getInstance();
  useController(auth);

  const user = auth.currentUser;
  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    avatar: user?.avatar ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);

  if (!user) return null;

  async function chooseAvatar() {
    try {
      const avatar = await pickImage({ maxDim: 256, quality: 0.85 });
      if (avatar) setProfile((p) => ({ ...p, avatar }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat foto.");
    }
  }

  function save() {
    if (!user) return;
    if (pw.next) {
      if (!user.checkPassword(pw.current)) {
        toast.error("Password saat ini salah");
        return;
      }
      if (pw.next !== pw.confirm) {
        toast.error("Konfirmasi password tidak cocok");
        return;
      }
    }
    const result = userCtrl.save(
      {
        name: profile.name,
        username: profile.username,
        email: profile.email,
        password: pw.next,
        role: user.role,
        active: user.active,
        avatar: profile.avatar,
      },
      user.id,
    );
    if (!result.success) {
      const first = Object.values(result.errors)[0];
      toast.error(first ?? "Gagal menyimpan profil");
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
            {profile.avatar && <AvatarImage src={profile.avatar} alt="" />}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.initials()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={chooseAvatar}
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <UploadCloud className="size-5" />
            <span className="text-xs">Ubah foto profil</span>
          </button>
          {profile.avatar && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setProfile((p) => ({ ...p, avatar: "" }))}>Hapus</Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap">
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="bg-input-background" />
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
function BackupSection() {
  const controller = SettingsController.getInstance();
  const [sibuk, setSibuk] = useState<"backup" | "restore" | "ekspor" | null>(null);

  async function ekspor() {
    setSibuk("ekspor");
    const result = await exportToExcel();
    setSibuk(null);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  async function backup() {
    setSibuk("backup");
    const result = await CloudSync.backup();
    setSibuk(null);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  async function restore() {
    setSibuk("restore");
    const result = await CloudSync.restore();
    if (!result.success) {
      setSibuk(null);
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    // muat ulang agar seluruh controller membaca data terbaru dari lokal
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div>
      <SectionHeader
        title="Data & Cadangan"
        desc="Data tersimpan otomatis di perangkat, dan bisa dicadangkan ke cloud (Supabase)."
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
              setiap ada perubahan, dan dimuat kembali saat aplikasi dibuka —
              tetap berjalan meski tanpa koneksi internet.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm">Ekspor ke Excel</p>
            <p className="text-xs text-muted-foreground">
              Unduh seluruh data penjualan, barang, service, dan mutasi stok
              sebagai berkas <code>.xlsx</code> yang bisa dibuka di Excel.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={ekspor}
            disabled={sibuk !== null}
          >
            {sibuk === "ekspor" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Ekspor Excel
          </Button>
        </div>

        {CloudSync.ready ? (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm">Backup ke cloud</p>
                <p className="text-xs text-muted-foreground">
                  Salin seluruh data perangkat ini ke Supabase. Data di cloud
                  dibuat sama persis dengan data lokal.
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 bg-primary-700 text-white hover:bg-primary-500"
                onClick={backup}
                disabled={sibuk !== null}
              >
                {sibuk === "backup" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CloudUpload className="size-4" />
                )}
                Backup Sekarang
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm">Restore dari cloud</p>
                <p className="text-xs text-muted-foreground">
                  Ganti seluruh data di perangkat ini dengan data cadangan dari
                  cloud. Data lokal saat ini akan ditimpa.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0" disabled={sibuk !== null}>
                    {sibuk === "restore" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CloudDownload className="size-4" />
                    )}
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pulihkan data dari cloud?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Seluruh data di perangkat ini akan diganti dengan data
                      cadangan terakhir dari cloud. Data lokal yang belum
                      dicadangkan akan hilang.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-primary-700 text-white hover:bg-primary-500"
                      onClick={restore}
                    >
                      Ya, Restore
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
              <CloudUpload className="size-4" />
            </span>
            <div>
              <p className="text-sm">Backup cloud belum aktif</p>
              <p className="text-xs text-muted-foreground">
                Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>{" "}
                pada berkas <code>.env</code> untuk mengaktifkan backup ke cloud.
              </p>
            </div>
          </div>
        )}

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
                    controller.resetDemoData();
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
              controller.resetSettings();
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
