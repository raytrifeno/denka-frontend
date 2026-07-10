import { Repository } from "../core/Repository";
import { Barang, type KategoriBarang, type StatusStok } from "../entities/Barang";

export interface FilterBarang {
  kataKunci?: string;
  kategori?: KategoriBarang | "all";
  statusStok?: StatusStok | "all";
}

export class BarangRepository extends Repository<Barang> {
  findByNama(nama: string): Barang | undefined {
    return this.rows.find((barang) => barang.nama === nama);
  }

  findByKode(kode: string): Barang | undefined {
    return this.rows.find((barang) => barang.kode.toLowerCase() === kode.toLowerCase());
  }

  cari(filter: FilterBarang): Barang[] {
    const q = (filter.kataKunci ?? "").trim().toLowerCase();
    return this.rows.filter((barang) => {
      const cocokKata =
        !q ||
        barang.nama.toLowerCase().includes(q) ||
        barang.kode.toLowerCase().includes(q) ||
        (barang.spesifikasi ?? "").toLowerCase().includes(q);
      const cocokKategori =
        !filter.kategori || filter.kategori === "all" || barang.kategori === filter.kategori;
      const cocokStok =
        !filter.statusStok || filter.statusStok === "all" || barang.statusStok() === filter.statusStok;
      return cocokKata && cocokKategori && cocokStok;
    });
  }

  stokMenipis(): Barang[] {
    return this.rows.filter((barang) => barang.statusStok() !== "aman");
  }

  tersedia(): Barang[] {
    return this.rows.filter((barang) => barang.stok > 0);
  }
}
