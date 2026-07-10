import { Observable } from "../core/Observable";
import { Database } from "../Database";
import type { Barang, KategoriBarang } from "../entities/Barang";
import type { ServiceOrder } from "../entities/ServiceOrder";
import type { TransaksiPenjualan } from "../entities/TransaksiPenjualan";

export interface TitikPenjualan {
  label: string;
  total: number;
}

export interface BarangTerlaris {
  nama: string;
  kategori: KategoriBarang;
  terjual: number;
  pendapatan: number;
}

export interface BarisLaporanStok {
  nama: string;
  stokAwal: number;
  masuk: number;
  keluar: number;
  stokAkhir: number;
  stokMinimum: number;
}

export interface BarisKeuntungan {
  nama: string;
  hargaBeli: number;
  hargaJual: number;
  terjual: number;
  untungPerItem: number;
  totalUntung: number;
}

export interface ItemPerhatian {
  id: string;
  tipe: "stok" | "service";
  judul: string;
  detail: string;
}

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function awalHari(tanggal: Date): Date {
  return new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
}

/**
 * LaporanController — controller class read-only yang merangkum data dari
 * beberapa repository sekaligus (transaksi, service, barang, mutasi stok)
 * untuk kebutuhan Dashboard dan halaman Laporan.
 */
export class LaporanController extends Observable {
  private static instance: LaporanController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.transaksi.subscribe(() => this.notify());
    this.db.service.subscribe(() => this.notify());
    this.db.barang.subscribe(() => this.notify());
    this.db.mutasiStok.subscribe(() => this.notify());
  }

  static getInstance(): LaporanController {
    if (!LaporanController.instance) {
      LaporanController.instance = new LaporanController();
    }
    return LaporanController.instance;
  }

  // ---------- KPI dashboard ----------

  penjualanHariIni(): number {
    return this.db.transaksi.totalPadaTanggal(new Date());
  }

  jumlahTransaksiHariIni(): number {
    return this.db.transaksi.padaTanggal(new Date()).length;
  }

  /** Perbandingan penjualan hari ini vs kemarin (untuk badge tren). */
  trenVsKemarin(): { naik: boolean; persen: string } | null {
    const kemarin = new Date();
    kemarin.setDate(kemarin.getDate() - 1);
    const totalKemarin = this.db.transaksi.totalPadaTanggal(kemarin);
    const totalHariIni = this.penjualanHariIni();
    if (totalKemarin === 0) return null;
    const selisih = ((totalHariIni - totalKemarin) / totalKemarin) * 100;
    return {
      naik: selisih >= 0,
      persen: Math.abs(selisih).toFixed(1).replace(".", ",") + "%",
    };
  }

  serviceBerjalan(): number {
    return this.db.service.sedangBerjalan().length;
  }

  serviceSelesaiHariIni(): number {
    const hariIni = awalHari(new Date()).getTime();
    return this.db.service
      .findAll()
      .filter((service) => {
        const selesai = service.tanggalSelesai();
        return selesai !== null && awalHari(selesai).getTime() === hariIni;
      }).length;
  }

  stokMenipis(): Barang[] {
    return this.db.barang.stokMenipis();
  }

  // ---------- grafik & daftar dashboard ----------

  trenPenjualan(jumlahHari: number): TitikPenjualan[] {
    const hasil: TitikPenjualan[] = [];
    for (let i = jumlahHari - 1; i >= 0; i--) {
      const tanggal = new Date();
      tanggal.setDate(tanggal.getDate() - i);
      hasil.push({
        label: NAMA_HARI[tanggal.getDay()],
        total: this.db.transaksi.totalPadaTanggal(tanggal),
      });
    }
    return hasil;
  }

  /** Komposisi status service untuk donut chart (dikelompokkan). */
  komposisiService(): { antri: number; dikerjakan: number; selesai: number; diambil: number } {
    const semua = this.db.service.findAll();
    const hitung = (daftarStatus: string[]) =>
      semua.filter((service) => daftarStatus.includes(service.status)).length;
    return {
      antri: hitung(["antri"]),
      dikerjakan: hitung(["diperiksa", "dikerjakan", "sparepart"]),
      selesai: hitung(["selesai"]),
      diambil: hitung(["diambil"]),
    };
  }

  serviceTerbaru(batas: number): ServiceOrder[] {
    return this.db.service
      .findAll()
      .sort((a, b) => b.tanggalMasuk.getTime() - a.tanggalMasuk.getTime())
      .slice(0, batas);
  }

  barangTerlaris(batas: number, dari?: Date, sampai?: Date): BarangTerlaris[] {
    const agregat = new Map<string, BarangTerlaris>();
    this.db.transaksi.dalamRentang(dari, sampai).forEach((transaksi) => {
      transaksi.items.forEach((item) => {
        const barang = this.db.barang.findById(item.barangId);
        const lama = agregat.get(item.namaBarang) ?? {
          nama: item.namaBarang,
          kategori: barang?.kategori ?? "lainnya",
          terjual: 0,
          pendapatan: 0,
        };
        lama.terjual += item.jumlah;
        lama.pendapatan += item.subtotal();
        agregat.set(item.namaBarang, lama);
      });
    });
    return [...agregat.values()].sort((a, b) => b.terjual - a.terjual).slice(0, batas);
  }

  perluPerhatian(): ItemPerhatian[] {
    const hasil: ItemPerhatian[] = [];
    this.stokMenipis()
      .slice(0, 2)
      .forEach((barang) => {
        hasil.push({
          id: "stok-" + barang.id,
          tipe: "stok",
          judul: barang.nama,
          detail:
            barang.stok === 0
              ? "Stok habis · segera lakukan restock"
              : `Sisa ${barang.stok} unit · di bawah batas minimum (${barang.stokMinimum})`,
        });
      });
    this.db.service
      .byStatus("selesai")
      .slice(0, 2)
      .forEach((service) => {
        const hari = Math.floor(
          (Date.now() - (service.tanggalSelesai()?.getTime() ?? Date.now())) / 86400000,
        );
        hasil.push({
          id: "svc-" + service.id,
          tipe: "service",
          judul: `${service.nomor} · ${service.merk}`,
          detail: hari > 0 ? `Selesai, belum diambil ${hari} hari` : "Selesai, siap diambil pelanggan",
        });
      });
    return hasil;
  }

  /** Notifikasi topbar: gabungan peringatan stok & service. */
  notifikasi(): ItemPerhatian[] {
    return this.perluPerhatian().slice(0, 4);
  }

  // ---------- halaman laporan ----------

  laporanPenjualan(dari?: Date, sampai?: Date): {
    transaksi: TransaksiPenjualan[];
    total: number;
    jumlahTransaksi: number;
    rataRata: number;
    perHari: TitikPenjualan[];
  } {
    const transaksi = this.db.transaksi
      .dalamRentang(dari, sampai)
      .sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
    const total = transaksi.reduce((jumlah, trx) => jumlah + trx.total(), 0);

    // grafik per hari dalam rentang (maksimal 31 titik)
    const perHari: TitikPenjualan[] = [];
    if (dari && sampai) {
      const kursor = awalHari(dari);
      const akhir = awalHari(sampai).getTime();
      while (kursor.getTime() <= akhir && perHari.length < 31) {
        perHari.push({
          label: `${kursor.getDate()} ${NAMA_BULAN[kursor.getMonth()]}`,
          total: this.db.transaksi.totalPadaTanggal(kursor),
        });
        kursor.setDate(kursor.getDate() + 1);
      }
    }

    return {
      transaksi,
      total,
      jumlahTransaksi: transaksi.length,
      rataRata: transaksi.length > 0 ? Math.round(total / transaksi.length) : 0,
      perHari,
    };
  }

  laporanStok(dari?: Date, sampai?: Date): BarisLaporanStok[] {
    const terjual = new Map<string, number>();
    this.db.transaksi.dalamRentang(dari, sampai).forEach((transaksi) => {
      transaksi.items.forEach((item) => {
        terjual.set(item.namaBarang, (terjual.get(item.namaBarang) ?? 0) + item.jumlah);
      });
    });

    return this.db.barang.findAll().map((barang) => {
      const mutasi = this.db.mutasiStok
        .untukBarang(barang.nama)
        .filter((entri) => {
          if (dari && entri.tanggal < awalHari(dari)) return false;
          if (sampai) {
            const akhir = new Date(awalHari(sampai).getTime() + 86399999);
            if (entri.tanggal > akhir) return false;
          }
          return true;
        });
      const masuk = mutasi
        .filter((entri) => entri.jenis === "masuk")
        .reduce((total, entri) => total + entri.jumlah, 0);
      const keluarNonJual = mutasi
        .filter((entri) => entri.jenis === "keluar")
        .reduce((total, entri) => total + entri.jumlah, 0);
      const keluar = keluarNonJual + (terjual.get(barang.nama) ?? 0);
      const stokAkhir = barang.stok;
      return {
        nama: barang.nama,
        stokAwal: stokAkhir - masuk + keluar,
        masuk,
        keluar,
        stokAkhir,
        stokMinimum: barang.stokMinimum,
      };
    });
  }

  laporanKeuntungan(dari?: Date, sampai?: Date): {
    omset: number;
    modal: number;
    untung: number;
    marginPersen: string;
    perBarang: BarisKeuntungan[];
    trenMingguan: { periode: string; omset: number; untung: number }[];
  } {
    const transaksi = this.db.transaksi.dalamRentang(dari, sampai);

    let omset = 0;
    let modal = 0;
    const perBarangMap = new Map<string, BarisKeuntungan>();
    transaksi.forEach((trx) => {
      trx.items.forEach((item) => {
        omset += item.subtotal();
        modal += item.hargaBeliSatuan * item.jumlah;
        const baris = perBarangMap.get(item.namaBarang) ?? {
          nama: item.namaBarang,
          hargaBeli: item.hargaBeliSatuan,
          hargaJual: item.hargaSatuan,
          terjual: 0,
          untungPerItem: item.hargaSatuan - item.hargaBeliSatuan,
          totalUntung: 0,
        };
        baris.terjual += item.jumlah;
        baris.totalUntung += item.keuntungan();
        perBarangMap.set(item.namaBarang, baris);
      });
    });
    const untung = omset - modal;

    // tren 4 minggu terakhir (dari transaksi keseluruhan)
    const trenMingguan: { periode: string; omset: number; untung: number }[] = [];
    for (let minggu = 3; minggu >= 0; minggu--) {
      const akhir = new Date();
      akhir.setDate(akhir.getDate() - minggu * 7);
      const awal = new Date(akhir);
      awal.setDate(awal.getDate() - 6);
      const dalamMinggu = this.db.transaksi.dalamRentang(awal, akhir);
      trenMingguan.push({
        periode: "Minggu " + (4 - minggu),
        omset: dalamMinggu.reduce((total, trx) => total + trx.total(), 0),
        untung: dalamMinggu.reduce((total, trx) => total + trx.keuntungan(), 0),
      });
    }

    return {
      omset,
      modal,
      untung,
      marginPersen: omset > 0 ? ((untung / omset) * 100).toFixed(1) : "0",
      perBarang: [...perBarangMap.values()].sort((a, b) => b.totalUntung - a.totalUntung),
      trenMingguan,
    };
  }

  laporanService(dari?: Date, sampai?: Date): {
    daftar: ServiceOrder[];
    masuk: number;
    selesai: number;
    pending: number;
    pendapatan: number;
  } {
    const daftar = this.db.service.findAll().filter((service) => {
      if (dari && service.tanggalMasuk < awalHari(dari)) return false;
      if (sampai) {
        const akhir = new Date(awalHari(sampai).getTime() + 86399999);
        if (service.tanggalMasuk > akhir) return false;
      }
      return true;
    });
    return {
      daftar,
      masuk: daftar.length,
      selesai: daftar.filter((service) => service.sudahSelesai()).length,
      pending: daftar.filter((service) => service.sedangBerjalan()).length,
      pendapatan: daftar
        .filter((service) => service.status === "diambil")
        .reduce((total, service) => total + service.totalBiaya(), 0),
    };
  }
}
