import { Entity, buatId } from "../core/Entity";

export type StatusService =
  | "antri"
  | "diperiksa"
  | "dikerjakan"
  | "sparepart"
  | "selesai"
  | "diambil";

export const URUTAN_STATUS: StatusService[] = [
  "antri",
  "diperiksa",
  "dikerjakan",
  "sparepart",
  "selesai",
  "diambil",
];

export type PrioritasService = "normal" | "urgent";

/** Satu sparepart yang dipakai dalam pengerjaan service. */
export class SparepartTerpakai {
  constructor(
    readonly id: string,
    readonly barangId: string,
    readonly nama: string,
    readonly jumlah: number,
    readonly harga: number,
  ) {}

  subtotal(): number {
    return this.harga * this.jumlah;
  }
}

/** Satu catatan perubahan status pada linimasa service. */
export class RiwayatStatus {
  constructor(
    readonly status: StatusService,
    readonly pada: Date,
  ) {}
}

export interface DataServiceOrder {
  id: string;
  nomor: string;
  pelanggan: string;
  telepon: string;
  alamat?: string;
  jenisUnit: string;
  merk: string;
  model?: string;
  nomorSeri?: string;
  kelengkapan?: string[];
  keluhan: string;
  diagnosa?: string;
  teknisi: string;
  prioritas: PrioritasService;
  status?: StatusService;
  tanggalMasuk: Date;
  biayaJasa?: number;
  sparepart?: SparepartTerpakai[];
  riwayat?: RiwayatStatus[];
}

/**
 * Entity class ServiceOrder — satu tiket service/reparasi.
 * Perubahan status hanya lewat ubahStatus() sehingga riwayat selalu tercatat.
 */
export class ServiceOrder extends Entity {
  private _nomor: string;
  private _pelanggan: string;
  private _telepon: string;
  private _alamat?: string;
  private _jenisUnit: string;
  private _merk: string;
  private _model?: string;
  private _nomorSeri?: string;
  private _kelengkapan: string[];
  private _keluhan: string;
  private _diagnosa?: string;
  private _teknisi: string;
  private _prioritas: PrioritasService;
  private _status: StatusService;
  private _tanggalMasuk: Date;
  private _biayaJasa: number;
  private _sparepart: SparepartTerpakai[];
  private _riwayat: RiwayatStatus[];

  constructor(data: DataServiceOrder) {
    super(data.id);
    this._nomor = data.nomor;
    this._pelanggan = data.pelanggan;
    this._telepon = data.telepon;
    this._alamat = data.alamat;
    this._jenisUnit = data.jenisUnit;
    this._merk = data.merk;
    this._model = data.model;
    this._nomorSeri = data.nomorSeri;
    this._kelengkapan = data.kelengkapan ?? [];
    this._keluhan = data.keluhan;
    this._diagnosa = data.diagnosa;
    this._teknisi = data.teknisi;
    this._prioritas = data.prioritas;
    this._status = data.status ?? "antri";
    this._tanggalMasuk = data.tanggalMasuk;
    this._biayaJasa = data.biayaJasa ?? 0;
    this._sparepart = data.sparepart ?? [];
    this._riwayat = data.riwayat ?? [new RiwayatStatus(this._status, data.tanggalMasuk)];
  }

  // ----- getter -----
  get nomor(): string { return this._nomor; }
  get pelanggan(): string { return this._pelanggan; }
  get telepon(): string { return this._telepon; }
  get alamat(): string | undefined { return this._alamat; }
  get jenisUnit(): string { return this._jenisUnit; }
  get merk(): string { return this._merk; }
  get model(): string | undefined { return this._model; }
  get nomorSeri(): string | undefined { return this._nomorSeri; }
  get kelengkapan(): string[] { return [...this._kelengkapan]; }
  get keluhan(): string { return this._keluhan; }
  get diagnosa(): string | undefined { return this._diagnosa; }
  get teknisi(): string { return this._teknisi; }
  get prioritas(): PrioritasService { return this._prioritas; }
  get status(): StatusService { return this._status; }
  get tanggalMasuk(): Date { return this._tanggalMasuk; }
  get biayaJasa(): number { return this._biayaJasa; }
  get sparepart(): SparepartTerpakai[] { return [...this._sparepart]; }
  get riwayat(): RiwayatStatus[] { return [...this._riwayat]; }

  // ----- metode domain -----
  /** Ubah status dan catat ke riwayat. Mengembalikan false jika status sama. */
  ubahStatus(status: StatusService): boolean {
    if (status === this._status) return false;
    this._status = status;
    this._riwayat.push(new RiwayatStatus(status, new Date()));
    return true;
  }

  sudahSelesai(): boolean {
    return this._status === "selesai" || this._status === "diambil";
  }

  sedangBerjalan(): boolean {
    return !this.sudahSelesai();
  }

  /** Tanggal pertama kali berstatus selesai (untuk laporan), null jika belum. */
  tanggalSelesai(): Date | null {
    const log = this._riwayat.find((riwayat) => riwayat.status === "selesai");
    return log ? log.pada : null;
  }

  totalBiaya(): number {
    return this._biayaJasa + this._sparepart.reduce((total, part) => total + part.subtotal(), 0);
  }

  tambahSparepart(barangId: string, nama: string, jumlah: number, harga: number): SparepartTerpakai {
    const part = new SparepartTerpakai(buatId("part"), barangId, nama, jumlah, harga);
    this._sparepart.push(part);
    return part;
  }

  hapusSparepart(partId: string): SparepartTerpakai | undefined {
    const part = this._sparepart.find((item) => item.id === partId);
    this._sparepart = this._sparepart.filter((item) => item.id !== partId);
    return part;
  }

  toggleKelengkapan(nama: string): void {
    if (this._kelengkapan.includes(nama)) {
      this._kelengkapan = this._kelengkapan.filter((item) => item !== nama);
    } else {
      this._kelengkapan.push(nama);
    }
  }

  set keluhan(keluhan: string) { this._keluhan = keluhan; }
  set diagnosa(diagnosa: string | undefined) { this._diagnosa = diagnosa; }
  set teknisi(teknisi: string) { this._teknisi = teknisi; }
  set biayaJasa(biaya: number) { this._biayaJasa = Math.max(0, biaya); }

  /** Pencocokan untuk kolom pencarian. */
  cocok(kataKunci: string): boolean {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return true;
    return this._pelanggan.toLowerCase().includes(q) || this._nomor.toLowerCase().includes(q);
  }

  /** Serialisasi untuk penyimpanan lokal. */
  toJSON(): ServiceOrderJSON {
    return {
      id: this.id,
      nomor: this._nomor,
      pelanggan: this._pelanggan,
      telepon: this._telepon,
      alamat: this._alamat,
      jenisUnit: this._jenisUnit,
      merk: this._merk,
      model: this._model,
      nomorSeri: this._nomorSeri,
      kelengkapan: [...this._kelengkapan],
      keluhan: this._keluhan,
      diagnosa: this._diagnosa,
      teknisi: this._teknisi,
      prioritas: this._prioritas,
      status: this._status,
      tanggalMasuk: this._tanggalMasuk.toISOString(),
      biayaJasa: this._biayaJasa,
      sparepart: this._sparepart.map((part) => ({
        id: part.id,
        barangId: part.barangId,
        nama: part.nama,
        jumlah: part.jumlah,
        harga: part.harga,
      })),
      riwayat: this._riwayat.map((log) => ({ status: log.status, pada: log.pada.toISOString() })),
    };
  }

  static dariJSON(data: ServiceOrderJSON): ServiceOrder {
    return new ServiceOrder({
      ...data,
      tanggalMasuk: new Date(data.tanggalMasuk),
      sparepart: data.sparepart.map(
        (part) => new SparepartTerpakai(part.id, part.barangId, part.nama, part.jumlah, part.harga),
      ),
      riwayat: data.riwayat.map((log) => new RiwayatStatus(log.status, new Date(log.pada))),
    });
  }
}

export interface ServiceOrderJSON {
  id: string;
  nomor: string;
  pelanggan: string;
  telepon: string;
  alamat?: string;
  jenisUnit: string;
  merk: string;
  model?: string;
  nomorSeri?: string;
  kelengkapan: string[];
  keluhan: string;
  diagnosa?: string;
  teknisi: string;
  prioritas: PrioritasService;
  status: StatusService;
  tanggalMasuk: string;
  biayaJasa: number;
  sparepart: { id: string; barangId: string; nama: string; jumlah: number; harga: number }[];
  riwayat: { status: StatusService; pada: string }[];
}
