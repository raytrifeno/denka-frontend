import { useState, type FormEvent } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BrandMark, BrandLockup } from "./brand-mark";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/utils";
import { AuthController } from "../../domain/controllers/AuthController";

// Akun demo (ada di seed PenggunaRepository).
const DEMO_USER = "budi@denkacomputer.id";
const DEMO_PASS = "denka123";

type LoginProps = {
  onLogin: () => void;
};

/**
 * Login — boundary class. Autentikasi didelegasikan ke AuthController;
 * komponen ini hanya mengurus tampilan form.
 */
export function Login({ onLogin }: LoginProps) {
  const auth = AuthController.getInstance();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // per-field validation
    const fieldErrors: { username?: string; password?: string } = {};
    if (!username.trim()) fieldErrors.username = "Username atau email wajib diisi.";
    if (!password) fieldErrors.password = "Password wajib diisi.";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    // Simulasi jeda request, lalu serahkan autentikasi ke AuthController.
    window.setTimeout(() => {
      const result = auth.login(username, password, remember);
      if (result.success) {
        onLogin();
      } else {
        setFormError(result.message ?? "Username atau password salah.");
        setLoading(false);
      }
    }, 800);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-card">
      {/* LEFT — branding (55%) */}
      <div
        className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: "linear-gradient(155deg, #14253B 0%, #1E3A5F 100%)" }}
      >
        <BlueprintArt />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-11 shrink-0" />
          <BrandLockup terang />
        </div>

        {/* Hero copy */}
        <div className="relative max-w-md">
          <h1 className="text-balance text-white" style={{ fontSize: "2rem", lineHeight: 1.25 }}>
            Sistem Manajemen Toko &amp; Service Komputer
          </h1>
          <p className="mt-4 text-white/70">
            Satu platform untuk penjualan, stok, dan tiket service — rapi, presisi,
            dan dapat dipercaya.
          </p>
        </div>

        <p className="relative text-xs text-white/50">
          © 2026 Denka Computer. Semua hak dilindungi.
        </p>
      </div>

      {/* RIGHT — form (45%) */}
      <div className="flex w-full items-center justify-center bg-card p-6 sm:p-10 lg:w-[45%]">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-10 shrink-0" />
            <BrandLockup />
          </div>

          <div className="mb-6">
            <h1 className="text-foreground">Masuk ke Akun Anda</h1>
            <p className="mt-1 text-muted-foreground">
              Kelola toko &amp; service dalam satu sistem.
            </p>
          </div>

          {/* form-level error */}
          {formError && (
            <div
              className="mb-5 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm"
              style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username / Email */}
            <div className="space-y-2">
              <Label htmlFor="username">Username atau Email</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="nama@denkacomputer.id"
                  value={username}
                  disabled={loading}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors((x) => ({ ...x, username: undefined }));
                  }}
                  aria-invalid={!!errors.username}
                  className={cn("pl-9", errors.username && "border-destructive")}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((x) => ({ ...x, password: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  className={cn("px-9", errors.password && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={loading}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  disabled={loading}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-muted-foreground">
                  Ingat saya
                </Label>
              </div>
              <a
                href="#"
                className="text-sm text-primary-700 transition-colors hover:text-primary-500 hover:underline"
              >
                Lupa password?
              </a>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-700 text-white hover:bg-primary-500"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <p className="mt-6 rounded-md bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
            Demo: <span className="text-foreground">{DEMO_USER}</span> /{" "}
            <span className="text-foreground">{DEMO_PASS}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Thin white line-art of a laptop & components — technical blueprint feel. */
function BlueprintArt() {
  return (
    <>
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 70%, rgba(47,92,143,0.45), transparent 50%)",
        }}
      />
      <svg
        className="pointer-events-none absolute -bottom-8 right-0 h-[70%] w-auto"
        viewBox="0 0 420 360"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* laptop base */}
        <path d="M70 250 L350 250 L370 290 L50 290 Z" />
        <line x1="180" y1="270" x2="240" y2="270" />
        {/* laptop screen */}
        <rect x="100" y="110" width="220" height="140" rx="6" />
        <rect x="114" y="124" width="192" height="112" rx="3" stroke="rgba(255,255,255,0.10)" />
        {/* screen circuit lines */}
        <line x1="134" y1="150" x2="220" y2="150" stroke="rgba(255,255,255,0.10)" />
        <line x1="134" y1="170" x2="286" y2="170" stroke="rgba(255,255,255,0.10)" />
        <line x1="134" y1="190" x2="200" y2="190" stroke="rgba(255,255,255,0.10)" />
        {/* CPU chip */}
        <rect x="250" y="60" width="64" height="64" rx="6" />
        <rect x="266" y="76" width="32" height="32" rx="3" stroke="rgba(255,255,255,0.12)" />
        {[68, 84, 100].map((y) => (
          <line key={"l" + y} x1="236" y1={y} x2="250" y2={y} />
        ))}
        {[68, 84, 100].map((y) => (
          <line key={"r" + y} x1="314" y1={y} x2="328" y2={y} />
        ))}
        {[262, 282, 302].map((x) => (
          <line key={"t" + x} x1={x} y1="46" x2={x} y2="60" />
        ))}
        {/* RAM stick */}
        <rect x="40" y="70" width="150" height="34" rx="4" />
        {[58, 76, 94, 112, 130, 148, 166].map((x) => (
          <line key={"ram" + x} x1={x} y1="104" x2={x} y2="116" />
        ))}
        <line x1="52" y1="87" x2="178" y2="87" stroke="rgba(255,255,255,0.10)" />
        {/* gear / settings accent */}
        <circle cx="360" cy="180" r="26" />
        <circle cx="360" cy="180" r="10" stroke="rgba(255,255,255,0.12)" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r1 = 26, r2 = 34;
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={"g" + deg}
              x1={360 + r1 * Math.cos(rad)}
              y1={180 + r1 * Math.sin(rad)}
              x2={360 + r2 * Math.cos(rad)}
              y2={180 + r2 * Math.sin(rad)}
            />
          );
        })}
      </svg>
    </>
  );
}
