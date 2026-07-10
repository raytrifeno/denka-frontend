import { Observable } from "../core/Observable";
import { Database } from "../Database";
import { PenyimpananLokal } from "../persistence/PenyimpananLokal";
import type { Pengguna, RolePengguna } from "../entities/Pengguna";

export interface HasilLogin {
  sukses: boolean;
  pesan?: string;
}

const KUNCI_SESI = "denka-sesi";

/**
 * AuthController — controller class untuk autentikasi & sesi pengguna.
 * Boundary (Login, Topbar, App) tidak pernah menyentuh entity Pengguna
 * secara langsung; semua lewat controller ini.
 *
 * Sesi disimpan di localStorage ("Ingat saya") atau sessionStorage,
 * sehingga pengguna tetap masuk setelah halaman dimuat ulang.
 */
export class AuthController extends Observable {
  private static instance: AuthController | null = null;

  private db = Database.getInstance();
  private _penggunaAktif: Pengguna | null = null;
  /** Fitur demo "lihat sebagai role" pada topbar. */
  private _rolePratinjau: RolePengguna | null = null;

  private constructor() {
    super();
    this.pulihkanSesi();
  }

  static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  /** Pulihkan sesi tersimpan saat aplikasi dibuka kembali. */
  private pulihkanSesi(): void {
    const sesi =
      PenyimpananLokal.muat<{ userId: string }>(KUNCI_SESI) ??
      PenyimpananLokal.muat<{ userId: string }>(KUNCI_SESI, true);
    if (!sesi) return;
    const pengguna = this.db.pengguna.findById(sesi.userId);
    if (pengguna && pengguna.aktif) {
      this._penggunaAktif = pengguna;
    } else {
      this.hapusSesiTersimpan();
    }
  }

  private hapusSesiTersimpan(): void {
    PenyimpananLokal.hapus(KUNCI_SESI);
    PenyimpananLokal.hapus(KUNCI_SESI, true);
  }

  login(identitas: string, password: string, ingatSaya = true): HasilLogin {
    const pengguna = this.db.pengguna.findByIdentitas(identitas);
    if (!pengguna || !pengguna.cekPassword(password)) {
      return { sukses: false, pesan: "Username atau password salah." };
    }
    if (!pengguna.aktif) {
      return { sukses: false, pesan: "Akun Anda dinonaktifkan. Hubungi pemilik toko." };
    }
    pengguna.catatLogin();
    this.db.pengguna.touch();
    this._penggunaAktif = pengguna;
    this._rolePratinjau = null;
    this.hapusSesiTersimpan();
    PenyimpananLokal.simpan(KUNCI_SESI, { userId: pengguna.id }, !ingatSaya);
    this.notify();
    return { sukses: true };
  }

  logout(): void {
    this._penggunaAktif = null;
    this._rolePratinjau = null;
    this.hapusSesiTersimpan();
    this.notify();
  }

  /**
   * Sinkronkan sesi setelah data berubah besar-besaran (mis. reset data demo):
   * instance entity lama diganti dengan yang baru dari repository.
   */
  sinkronSesi(): void {
    if (!this._penggunaAktif) return;
    const segar = this.db.pengguna.findById(this._penggunaAktif.id);
    this._penggunaAktif = segar && segar.aktif ? segar : null;
    if (!this._penggunaAktif) this.hapusSesiTersimpan();
    this.notify();
  }

  get sudahLogin(): boolean {
    return this._penggunaAktif !== null;
  }

  get penggunaAktif(): Pengguna | null {
    return this._penggunaAktif;
  }

  /** Nama pengguna aktif — dipakai untuk kolom "dicatat oleh"/kasir. */
  get namaPenggunaAktif(): string {
    return this._penggunaAktif?.nama ?? "-";
  }

  /** Role efektif yang dipakai UI (mempertimbangkan mode pratinjau). */
  get role(): RolePengguna {
    return this._rolePratinjau ?? this._penggunaAktif?.role ?? "admin";
  }

  gantiRolePratinjau(role: RolePengguna): void {
    this._rolePratinjau = role;
    this.notify();
  }
}
