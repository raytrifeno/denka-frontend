import { Repository } from "../core/Repository";
import { User } from "../entities/User";

export class UserRepository extends Repository<User> {
  findByIdentity(identity: string): User | undefined {
    return this.rows.find((user) => user.matchesIdentity(identity));
  }

  isUsernameTaken(username: string, exceptId?: string): boolean {
    return this.rows.some(
      (user) =>
        user.username.toLowerCase() === username.trim().toLowerCase() &&
        user.id !== exceptId,
    );
  }
}
