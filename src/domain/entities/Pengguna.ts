import { Entity } from "../core/Entity";

export type RolePengguna = "pemilik" | "admin";

export interface DataPengguna {
  id: string;
  nama: string;
  username: string;
  email: string;
  password: string;
  role: RolePengguna;
  aktif: boolean;
  terakhirLogin?: Date | null;
}

/**
 * Entity class Pengguna — akun pemakai sistem.
 * Password disimpan private dan hanya bisa diverifikasi lewat cekPassword()
 * (tidak pernah dibaca langsung oleh boundary).
 */
export class Pengguna extends Entity {
  private _nama: string;
  private _username: string;
  private _email: string;
  private _password: string;
  private _role: RolePengguna;
  private _aktif: boolean;
  private _terakhirLogin: Date | null;

  constructor(data: DataPengguna) {
    super(data.id);
    this._nama = data.nama;
    this._username = data.username;
    this._email = data.email;
    this._password = data.password;
    this._role = data.role;
    this._aktif = data.aktif;
    this._terakhirLogin = data.terakhirLogin ?? null;
  }

  get nama(): string { return this._nama; }
  get username(): string { return this._username; }
  get email(): string { return this._email; }
  get role(): RolePengguna { return this._role; }
  get aktif(): boolean { return this._aktif; }
  get terakhirLogin(): Date | null { return this._terakhirLogin; }

  inisial(): string {
    return this._nama
      .split(" ")
      .slice(0, 2)
      .map((kata) => kata[0])
      .join("")
      .toUpperCase();
  }

  /** Cocokkan identitas login dengan username ATAU email. */
  cocokIdentitas(identitas: string): boolean {
    const id = identitas.trim().toLowerCase();
    return this._username.toLowerCase() === id || this._email.toLowerCase() === id;
  }

  cekPassword(password: string): boolean {
    return this._password === password;
  }

  catatLogin(): void {
    this._terakhirLogin = new Date();
  }

  setAktif(aktif: boolean): void {
    this._aktif = aktif;
  }

  /** Serialisasi untuk penyimpanan lokal. */
  toJSON(): DataPengguna {
    return {
      id: this.id,
      nama: this._nama,
      username: this._username,
      email: this._email,
      password: this._password,
      role: this._role,
      aktif: this._aktif,
      terakhirLogin: this._terakhirLogin,
    };
  }

  static dariJSON(data: Omit<DataPengguna, "terakhirLogin"> & { terakhirLogin?: string | Date | null }): Pengguna {
    return new Pengguna({
      ...data,
      terakhirLogin: data.terakhirLogin ? new Date(data.terakhirLogin) : null,
    });
  }

  perbarui(data: {
    nama: string;
    username: string;
    email: string;
    role: RolePengguna;
    aktif: boolean;
    passwordBaru?: string;
  }): void {
    this._nama = data.nama;
    this._username = data.username;
    this._email = data.email;
    this._role = data.role;
    this._aktif = data.aktif;
    if (data.passwordBaru) this._password = data.passwordBaru;
  }
}
