import { Repository } from "../core/Repository";
import { BarangKeluar, BarangMasuk, MutasiStok } from "../entities/MutasiStok";

export class MutasiStokRepository extends Repository<MutasiStok> {
  /** Polimorfisme: memilah subclass memakai instanceof. */
  daftarMasuk(): BarangMasuk[] {
    return this.rows.filter((mutasi): mutasi is BarangMasuk => mutasi instanceof BarangMasuk);
  }

  daftarKeluar(): BarangKeluar[] {
    return this.rows.filter((mutasi): mutasi is BarangKeluar => mutasi instanceof BarangKeluar);
  }

  untukBarang(namaBarang: string): MutasiStok[] {
    return this.rows.filter((mutasi) => mutasi.namaBarang === namaBarang);
  }
}
