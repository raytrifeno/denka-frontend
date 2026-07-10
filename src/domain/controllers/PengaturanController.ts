import { Observable } from "../core/Observable";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import { PenyimpananLokal } from "../persistence/PenyimpananLokal";

export interface ProfilToko {
  nama: string;
  alamat: string;
  telepon: string;
}

export interface PengaturanStruk {
  tampilkanLogo: boolean;
  tampilkanAlamat: boolean;
  footer: string;
}

export interface PengaturanWhatsApp {
  aktif: boolean;
  template: string;
}

interface DataPengaturan {
  toko: ProfilToko;
  struk: PengaturanStruk;
  whatsapp: PengaturanWhatsApp;
  kategoriTambahan: string[];
}

const KUNCI_PENGATURAN = "denka-pengaturan";

const BAWAAN: DataPengaturan = {
  toko: {
    nama: "Denka Computer",
    alamat: "Jl. Teknologi No. 17, Jakarta Selatan",
    telepon: "021-12345678",
  },
  struk: {
    tampilkanLogo: true,
    tampilkanAlamat: true,
    footer: "Terima kasih telah berbelanja di Denka Computer!",
  },
  whatsapp: {
    aktif: true,
    template:
      "Halo {nama_pelanggan}, terima kasih telah berbelanja di {nama_toko}. Transaksi {no_transaksi} sebesar {total_belanja} telah berhasil. Struk digital terlampir.",
  },
  kategoriTambahan: [],
};

/**
 * PengaturanController — controller class untuk preferensi aplikasi
 * (profil toko, struk, WhatsApp, kategori tambahan) yang tersimpan di
 * penyimpanan lokal, serta aksi pemeliharaan data (reset data demo).
 */
export class PengaturanController extends Observable {
  private static instance: PengaturanController | null = null;

  private data: DataPengaturan;

  private constructor() {
    super();
    const tersimpan = PenyimpananLokal.muat<DataPengaturan>(KUNCI_PENGATURAN);
    this.data = tersimpan ? { ...BAWAAN, ...tersimpan } : { ...BAWAAN };
  }

  static getInstance(): PengaturanController {
    if (!PengaturanController.instance) {
      PengaturanController.instance = new PengaturanController();
    }
    return PengaturanController.instance;
  }

  private simpan(): void {
    PenyimpananLokal.simpan(KUNCI_PENGATURAN, this.data);
    this.notify();
  }

  // ----- profil toko -----
  get toko(): ProfilToko {
    return { ...this.data.toko };
  }

  setToko(toko: ProfilToko): void {
    this.data.toko = { ...toko };
    this.simpan();
  }

  // ----- struk -----
  get struk(): PengaturanStruk {
    return { ...this.data.struk };
  }

  setStruk(struk: PengaturanStruk): void {
    this.data.struk = { ...struk };
    this.simpan();
  }

  // ----- whatsapp -----
  get whatsapp(): PengaturanWhatsApp {
    return { ...this.data.whatsapp };
  }

  setWhatsApp(pengaturan: PengaturanWhatsApp): void {
    this.data.whatsapp = { ...pengaturan };
    this.simpan();
  }

  // ----- kategori tambahan -----
  /** Lima kategori inti + kategori tambahan buatan pengguna. */
  get semuaKategori(): string[] {
    return ["Laptop", "PC & Komponen", "Aksesoris", "Sparepart", "Lainnya", ...this.data.kategoriTambahan];
  }

  get kategoriTambahan(): string[] {
    return [...this.data.kategoriTambahan];
  }

  tambahKategori(nama: string): { sukses: boolean; pesan?: string } {
    const bersih = nama.trim();
    if (!bersih) return { sukses: false, pesan: "Nama kategori tidak boleh kosong." };
    const sudahAda = this.semuaKategori.some(
      (kategori) => kategori.toLowerCase() === bersih.toLowerCase(),
    );
    if (sudahAda) return { sukses: false, pesan: "Kategori sudah ada." };
    this.data.kategoriTambahan.push(bersih);
    this.simpan();
    return { sukses: true };
  }

  hapusKategori(nama: string): void {
    this.data.kategoriTambahan = this.data.kategoriTambahan.filter((kategori) => kategori !== nama);
    this.simpan();
  }

  // ----- pemeliharaan data -----
  /** Kembalikan seluruh data transaksi/stok/service ke kondisi demo awal. */
  resetDataDemo(): void {
    Database.getInstance().resetKeSeedAwal();
    AuthController.getInstance().sinkronSesi();
  }

  /** Kembalikan preferensi pengaturan ke bawaan. */
  resetPengaturan(): void {
    this.data = JSON.parse(JSON.stringify(BAWAAN)) as DataPengaturan;
    PenyimpananLokal.hapus(KUNCI_PENGATURAN);
    this.notify();
  }
}
