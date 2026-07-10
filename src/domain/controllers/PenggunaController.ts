import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import { Pengguna, type RolePengguna } from "../entities/Pengguna";

export interface FormPengguna {
  nama: string;
  username: string;
  email: string;
  password: string;
  role: RolePengguna;
  aktif: boolean;
}

export type ErrorPengguna = Record<string, string>;

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PenggunaController — controller class manajemen akun (khusus Pemilik).
 * Aturan bisnis: akun yang sedang login tidak boleh dihapus/dinonaktifkan
 * oleh dirinya sendiri.
 */
export class PenggunaController extends Observable {
  private static instance: PenggunaController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private constructor() {
    super();
    this.db.pengguna.subscribe(() => this.notify());
    this.auth.subscribe(() => this.notify());
  }

  static getInstance(): PenggunaController {
    if (!PenggunaController.instance) {
      PenggunaController.instance = new PenggunaController();
    }
    return PenggunaController.instance;
  }

  daftar(): Pengguna[] {
    return this.db.pengguna.findAll();
  }

  adalahPenggunaAktif(id: string): boolean {
    return this.auth.penggunaAktif?.id === id;
  }

  toggleAktif(id: string): { sukses: boolean; pesan?: string } {
    if (this.adalahPenggunaAktif(id)) {
      return { sukses: false, pesan: "Tidak dapat menonaktifkan akun sendiri." };
    }
    const pengguna = this.db.pengguna.findById(id);
    if (!pengguna) return { sukses: false, pesan: "Pengguna tidak ditemukan." };
    pengguna.setAktif(!pengguna.aktif);
    this.db.pengguna.touch();
    return { sukses: true };
  }

  hapus(id: string): { sukses: boolean; pesan?: string } {
    if (this.adalahPenggunaAktif(id)) {
      return { sukses: false, pesan: "Tidak dapat menghapus akun sendiri." };
    }
    this.db.pengguna.delete(id);
    return { sukses: true };
  }

  validasi(form: FormPengguna, idEdit?: string): ErrorPengguna {
    const errors: ErrorPengguna = {};
    if (!form.nama.trim()) errors.nama = "Nama lengkap wajib diisi.";
    if (!form.username.trim()) errors.username = "Username wajib diisi.";
    else if (this.db.pengguna.usernameSudahDipakai(form.username, idEdit)) {
      errors.username = "Username sudah dipakai.";
    }
    if (!form.email.trim()) errors.email = "Email wajib diisi.";
    else if (!POLA_EMAIL.test(form.email)) errors.email = "Format email tidak valid.";
    if (!idEdit && !form.password) errors.password = "Password wajib diisi untuk pengguna baru.";
    return errors;
  }

  simpan(form: FormPengguna, idEdit?: string): { sukses: boolean; errors: ErrorPengguna } {
    const errors = this.validasi(form, idEdit);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    const lama = idEdit ? this.db.pengguna.findById(idEdit) : undefined;
    if (lama) {
      lama.perbarui({
        nama: form.nama.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        aktif: form.aktif,
        passwordBaru: form.password || undefined,
      });
      this.db.pengguna.touch();
    } else {
      this.db.pengguna.save(
        new Pengguna({
          id: buatId("usr"),
          nama: form.nama.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          aktif: form.aktif,
        }),
      );
    }
    return { sukses: true, errors: {} };
  }
}
