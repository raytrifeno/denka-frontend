import { Repository } from "../core/Repository";
import { Pengguna } from "../entities/Pengguna";

export class PenggunaRepository extends Repository<Pengguna> {
  findByIdentitas(identitas: string): Pengguna | undefined {
    return this.rows.find((pengguna) => pengguna.cocokIdentitas(identitas));
  }

  usernameSudahDipakai(username: string, kecualiId?: string): boolean {
    return this.rows.some(
      (pengguna) =>
        pengguna.username.toLowerCase() === username.trim().toLowerCase() &&
        pengguna.id !== kecualiId,
    );
  }
}
