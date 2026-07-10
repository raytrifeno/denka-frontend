import { Entity } from "../core/Entity";

/**
 * MutasiStok — kelas abstrak untuk pencatatan pergerakan stok.
 * Contoh pewarisan (inheritance): BarangMasuk dan BarangKeluar mewarisi
 * atribut umum dari MutasiStok dan menambahkan atribut khususnya sendiri.
 */
export abstract class MutasiStok extends Entity {
  private _tanggal: Date;
  private _namaBarang: string;
  private _jumlah: number;
  private _dicatatOleh: string;
  private _catatan?: string;

  protected constructor(
    id: string,
    tanggal: Date,
    namaBarang: string,
    jumlah: number,
    dicatatOleh: string,
    catatan?: string,
  ) {
    super(id);
    if (jumlah <= 0) throw new Error("Jumlah mutasi stok harus lebih dari 0.");
    this._tanggal = tanggal;
    this._namaBarang = namaBarang;
    this._jumlah = jumlah;
    this._dicatatOleh = dicatatOleh;
    this._catatan = catatan;
  }

  get tanggal(): Date { return this._tanggal; }
  get namaBarang(): string { return this._namaBarang; }
  get jumlah(): number { return this._jumlah; }
  get dicatatOleh(): string { return this._dicatatOleh; }
  get catatan(): string | undefined { return this._catatan; }

  /** Polimorfisme: tiap subclass menentukan jenis mutasinya sendiri. */
  abstract get jenis(): "masuk" | "keluar";
}

/** BarangMasuk — penerimaan stok dari supplier. */
export class BarangMasuk extends MutasiStok {
  private _supplier: string;
  private _hargaSatuan: number;
  private _noFaktur?: string;

  constructor(data: {
    id: string;
    tanggal: Date;
    namaBarang: string;
    jumlah: number;
    supplier: string;
    hargaSatuan: number;
    noFaktur?: string;
    catatan?: string;
    dicatatOleh: string;
  }) {
    super(data.id, data.tanggal, data.namaBarang, data.jumlah, data.dicatatOleh, data.catatan);
    this._supplier = data.supplier;
    this._hargaSatuan = data.hargaSatuan;
    this._noFaktur = data.noFaktur;
  }

  get jenis(): "masuk" { return "masuk"; }
  get supplier(): string { return this._supplier; }
  get hargaSatuan(): number { return this._hargaSatuan; }
  get noFaktur(): string | undefined { return this._noFaktur; }

  totalBiaya(): number {
    return this._hargaSatuan * this.jumlah;
  }
}

export type AlasanKeluar = "rusak" | "retur" | "internal" | "lainnya";

export const LABEL_ALASAN: Record<AlasanKeluar, string> = {
  rusak: "Rusak",
  retur: "Retur ke Supplier",
  internal: "Pemakaian Internal",
  lainnya: "Lainnya",
};

/** BarangKeluar — pengeluaran stok selain penjualan (rusak, retur, internal). */
export class BarangKeluar extends MutasiStok {
  private _alasan: AlasanKeluar;

  constructor(data: {
    id: string;
    tanggal: Date;
    namaBarang: string;
    jumlah: number;
    alasan: AlasanKeluar;
    catatan?: string;
    dicatatOleh: string;
  }) {
    super(data.id, data.tanggal, data.namaBarang, data.jumlah, data.dicatatOleh, data.catatan);
    this._alasan = data.alasan;
  }

  get jenis(): "keluar" { return "keluar"; }
  get alasan(): AlasanKeluar { return this._alasan; }

  labelAlasan(): string {
    return LABEL_ALASAN[this._alasan];
  }
}

// ---------- serialisasi ----------

export interface MutasiStokJSON {
  jenis: "masuk" | "keluar";
  id: string;
  tanggal: string;
  namaBarang: string;
  jumlah: number;
  dicatatOleh: string;
  catatan?: string;
  // khusus masuk
  supplier?: string;
  hargaSatuan?: number;
  noFaktur?: string;
  // khusus keluar
  alasan?: AlasanKeluar;
}

export function mutasiKeJSON(mutasi: MutasiStok): MutasiStokJSON {
  const dasar = {
    jenis: mutasi.jenis,
    id: mutasi.id,
    tanggal: mutasi.tanggal.toISOString(),
    namaBarang: mutasi.namaBarang,
    jumlah: mutasi.jumlah,
    dicatatOleh: mutasi.dicatatOleh,
    catatan: mutasi.catatan,
  };
  if (mutasi instanceof BarangMasuk) {
    return { ...dasar, supplier: mutasi.supplier, hargaSatuan: mutasi.hargaSatuan, noFaktur: mutasi.noFaktur };
  }
  if (mutasi instanceof BarangKeluar) {
    return { ...dasar, alasan: mutasi.alasan };
  }
  return dasar;
}

/** Rekonstruksi subclass yang tepat dari JSON (polimorfisme lewat kolom `jenis`). */
export function mutasiDariJSON(data: MutasiStokJSON): MutasiStok {
  const dasar = {
    id: data.id,
    tanggal: new Date(data.tanggal),
    namaBarang: data.namaBarang,
    jumlah: data.jumlah,
    dicatatOleh: data.dicatatOleh,
    catatan: data.catatan,
  };
  if (data.jenis === "masuk") {
    return new BarangMasuk({
      ...dasar,
      supplier: data.supplier ?? "-",
      hargaSatuan: data.hargaSatuan ?? 0,
      noFaktur: data.noFaktur,
    });
  }
  return new BarangKeluar({ ...dasar, alasan: data.alasan ?? "lainnya" });
}
