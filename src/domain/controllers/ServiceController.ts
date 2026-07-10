import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import type { Barang } from "../entities/Barang";
import {
  ServiceOrder,
  URUTAN_STATUS,
  type PrioritasService,
  type StatusService,
} from "../entities/ServiceOrder";

export interface FormServiceBaru {
  pelanggan: string;
  telepon: string;
  alamat: string;
  jenisUnit: string;
  merk: string;
  model: string;
  keluhan: string;
  prioritas: PrioritasService;
  teknisi: string;
}

export type ErrorService = Record<string, string>;

export const DAFTAR_TEKNISI = ["Budi Denka", "Rizki Teknisi", "Agus Pratama"];

export const PILIHAN_KELENGKAPAN = [
  "Charger / Adaptor",
  "Tas Laptop",
  "Baterai",
  "Kabel Data",
  "Dus / Box",
];

/**
 * ServiceController — controller class untuk tiket service komputer.
 * Mengatur alur status (kanban), sparepart (terhubung ke stok Barang),
 * dan pembuatan tiket baru.
 */
export class ServiceController extends Observable {
  private static instance: ServiceController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.service.subscribe(() => this.notify());
    this.db.barang.subscribe(() => this.notify());
  }

  static getInstance(): ServiceController {
    if (!ServiceController.instance) {
      ServiceController.instance = new ServiceController();
    }
    return ServiceController.instance;
  }

  daftar(kataKunci = "", status: StatusService | "all" = "all"): ServiceOrder[] {
    return this.db.service.cari(kataKunci, status);
  }

  cariById(id: string): ServiceOrder | undefined {
    return this.db.service.findById(id);
  }

  hitungPerStatus(): Record<string, number> {
    const hasil: Record<string, number> = { all: this.db.service.count() };
    URUTAN_STATUS.forEach((status) => {
      hasil[status] = this.db.service.byStatus(status).length;
    });
    return hasil;
  }

  ubahStatus(id: string, status: StatusService): void {
    const service = this.db.service.findById(id);
    if (service && service.ubahStatus(status)) {
      this.db.service.touch();
    }
  }

  perbaruiInfo(
    id: string,
    patch: { keluhan?: string; diagnosa?: string; teknisi?: string; biayaJasa?: number },
  ): void {
    const service = this.db.service.findById(id);
    if (!service) return;
    if (patch.keluhan !== undefined) service.keluhan = patch.keluhan;
    if (patch.diagnosa !== undefined) service.diagnosa = patch.diagnosa;
    if (patch.teknisi !== undefined) service.teknisi = patch.teknisi;
    if (patch.biayaJasa !== undefined) service.biayaJasa = patch.biayaJasa;
    this.db.service.touch();
  }

  toggleKelengkapan(id: string, nama: string): void {
    const service = this.db.service.findById(id);
    if (!service) return;
    service.toggleKelengkapan(nama);
    this.db.service.touch();
  }

  /** Pilihan sparepart dari inventori (hanya yang masih ada stoknya). */
  pilihanSparepart(): Barang[] {
    return this.db.barang.tersedia();
  }

  /** Tambah sparepart ke tiket sekaligus mengurangi stok inventori. */
  tambahSparepart(id: string, barangId: string, jumlah: number): { sukses: boolean; pesan?: string } {
    const service = this.db.service.findById(id);
    const barang = this.db.barang.findById(barangId);
    if (!service || !barang) return { sukses: false, pesan: "Data tidak ditemukan." };
    if (!barang.stokCukup(jumlah)) {
      return { sukses: false, pesan: `Stok ${barang.nama} tidak mencukupi (tersedia ${barang.stok}).` };
    }
    barang.kurangiStok(jumlah);
    service.tambahSparepart(barang.id, barang.nama, jumlah, barang.hargaJual);
    this.db.service.touch();
    this.db.barang.touch();
    return { sukses: true };
  }

  /** Hapus sparepart dari tiket dan kembalikan stoknya ke inventori. */
  hapusSparepart(id: string, partId: string): void {
    const service = this.db.service.findById(id);
    if (!service) return;
    const part = service.hapusSparepart(partId);
    if (part) {
      this.db.barang.findById(part.barangId)?.tambahStok(part.jumlah);
      this.db.barang.touch();
    }
    this.db.service.touch();
  }

  validasi(form: FormServiceBaru): ErrorService {
    const errors: ErrorService = {};
    if (!form.pelanggan.trim()) errors.pelanggan = "Nama pelanggan wajib diisi.";
    if (!form.telepon.trim()) errors.telepon = "No. WhatsApp wajib diisi.";
    if (!form.jenisUnit) errors.jenisUnit = "Pilih jenis unit.";
    if (!form.merk.trim()) errors.merk = "Merk wajib diisi.";
    if (!form.keluhan.trim()) errors.keluhan = "Keluhan wajib diisi.";
    return errors;
  }

  buatService(form: FormServiceBaru): { sukses: boolean; errors: ErrorService } {
    const errors = this.validasi(form);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    this.db.service.save(
      new ServiceOrder({
        id: buatId("srv"),
        nomor: this.db.service.nomorBerikutnya(),
        pelanggan: form.pelanggan.trim(),
        telepon: form.telepon.trim(),
        alamat: form.alamat.trim() || undefined,
        jenisUnit: form.jenisUnit,
        merk: form.merk.trim(),
        model: form.model.trim() || undefined,
        keluhan: form.keluhan.trim(),
        teknisi: form.teknisi,
        prioritas: form.prioritas,
        tanggalMasuk: new Date(),
      }),
    );
    return { sukses: true, errors: {} };
  }
}
