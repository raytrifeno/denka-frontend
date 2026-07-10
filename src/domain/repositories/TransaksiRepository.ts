import { Repository } from "../core/Repository";
import { TransaksiPenjualan } from "../entities/TransaksiPenjualan";

function tanggalSama(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export class TransaksiRepository extends Repository<TransaksiPenjualan> {
  /**
   * Nomor nota berikutnya, diturunkan dari nomor tertinggi yang tersimpan
   * (pengganti auto-increment database — tetap benar setelah dimuat ulang
   * dari penyimpanan lokal).
   */
  nomorBerikutnya(): string {
    const tertinggi = this.rows.reduce((maks, transaksi) => {
      const angka = parseInt(transaksi.nomor.replace(/\D/g, ""), 10);
      return Number.isFinite(angka) ? Math.max(maks, angka) : maks;
    }, 1042);
    return "TRX-" + (tertinggi + 1);
  }

  padaTanggal(tanggal: Date): TransaksiPenjualan[] {
    return this.rows.filter((transaksi) => tanggalSama(transaksi.tanggal, tanggal));
  }

  dalamRentang(dari?: Date, sampai?: Date): TransaksiPenjualan[] {
    return this.rows.filter((transaksi) => {
      const waktu = transaksi.tanggal.getTime();
      if (dari) {
        const awal = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate()).getTime();
        if (waktu < awal) return false;
      }
      if (sampai) {
        const akhir = new Date(
          sampai.getFullYear(),
          sampai.getMonth(),
          sampai.getDate(),
          23, 59, 59, 999,
        ).getTime();
        if (waktu > akhir) return false;
      }
      return true;
    });
  }

  totalPadaTanggal(tanggal: Date): number {
    return this.padaTanggal(tanggal).reduce((total, transaksi) => total + transaksi.total(), 0);
  }
}
