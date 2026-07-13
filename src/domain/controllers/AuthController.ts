import { Observable } from "../core/Observable";
import { Database } from "../Database";
import { LocalStore } from "../persistence/LocalStore";
import type { User, UserRole } from "../entities/User";

export interface LoginResult {
  success: boolean;
  message?: string;
}

const KEY_SESSION = "denka-session";

/**
 * AuthController — authentication & user session.
 * Boundaries (Login, Topbar, App) never touch the User entity directly;
 * everything goes through this controller.
 *
 * The session is stored in localStorage ("remember me") or sessionStorage,
 * so the user stays signed in after a reload.
 */
export class AuthController extends Observable {
  private static instance: AuthController | null = null;

  private db = Database.getInstance();
  private _currentUser: User | null = null;
  /** Demo "view as role" feature in the topbar. */
  private _previewRole: UserRole | null = null;

  private constructor() {
    super();
    this.restoreSession();
  }

  static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  /** Restore a stored session when the app reopens. */
  private restoreSession(): void {
    const session =
      LocalStore.load<{ userId: string }>(KEY_SESSION) ??
      LocalStore.load<{ userId: string }>(KEY_SESSION, true);
    if (!session) return;
    const user = this.db.users.findById(session.userId);
    if (user && user.active) {
      this._currentUser = user;
    } else {
      this.clearStoredSession();
    }
  }

  private clearStoredSession(): void {
    LocalStore.remove(KEY_SESSION);
    LocalStore.remove(KEY_SESSION, true);
  }

  login(identity: string, password: string, rememberMe = true): LoginResult {
    const user = this.db.users.findByIdentity(identity);
    if (!user || !user.checkPassword(password)) {
      return { success: false, message: "Username atau password salah." };
    }
    if (!user.active) {
      return { success: false, message: "Akun Anda dinonaktifkan. Hubungi pemilik toko." };
    }
    user.recordLogin();
    this.db.users.touch();
    this._currentUser = user;
    this._previewRole = null;
    this.clearStoredSession();
    LocalStore.save(KEY_SESSION, { userId: user.id }, !rememberMe);
    this.notify();
    return { success: true };
  }

  logout(): void {
    this._currentUser = null;
    this._previewRole = null;
    this.clearStoredSession();
    this.notify();
  }

  /**
   * Sync the session after a bulk data change (e.g. demo data reset):
   * the old entity instance is replaced with the fresh one from the repository.
   */
  syncSession(): void {
    if (!this._currentUser) return;
    const fresh = this.db.users.findById(this._currentUser.id);
    this._currentUser = fresh && fresh.active ? fresh : null;
    if (!this._currentUser) this.clearStoredSession();
    this.notify();
  }

  get isLoggedIn(): boolean {
    return this._currentUser !== null;
  }

  get currentUser(): User | null {
    return this._currentUser;
  }

  /** Active user's name — used for "recorded by"/cashier columns. */
  get currentUserName(): string {
    return this._currentUser?.name ?? "-";
  }

  /** Effective role used by the UI (accounts for preview mode). */
  get role(): UserRole {
    return this._previewRole ?? this._currentUser?.role ?? "admin";
  }

  setPreviewRole(role: UserRole): void {
    this._previewRole = role;
    this.notify();
  }
}
