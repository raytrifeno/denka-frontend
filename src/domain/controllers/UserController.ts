import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import { User, type UserRole } from "../entities/User";

export interface UserForm {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  avatar: string;
}

export type UserErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UserController — account management (owner only).
 * Business rule: the currently logged-in account cannot delete/deactivate itself.
 */
export class UserController extends Observable {
  private static instance: UserController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private constructor() {
    super();
    this.db.users.subscribe(() => this.notify());
    this.auth.subscribe(() => this.notify());
  }

  static getInstance(): UserController {
    if (!UserController.instance) {
      UserController.instance = new UserController();
    }
    return UserController.instance;
  }

  list(): User[] {
    return this.db.users.findAll();
  }

  isCurrentUser(id: string): boolean {
    return this.auth.currentUser?.id === id;
  }

  toggleActive(id: string): { success: boolean; message?: string } {
    if (this.isCurrentUser(id)) {
      return { success: false, message: "Tidak dapat menonaktifkan akun sendiri." };
    }
    const user = this.db.users.findById(id);
    if (!user) return { success: false, message: "Pengguna tidak ditemukan." };
    user.setActive(!user.active);
    this.db.users.touch();
    return { success: true };
  }

  remove(id: string): { success: boolean; message?: string } {
    if (this.isCurrentUser(id)) {
      return { success: false, message: "Tidak dapat menghapus akun sendiri." };
    }
    this.db.users.delete(id);
    return { success: true };
  }

  validate(form: UserForm, editId?: string): UserErrors {
    const errors: UserErrors = {};
    if (!form.name.trim()) errors.name = "Nama lengkap wajib diisi.";
    if (!form.username.trim()) errors.username = "Username wajib diisi.";
    else if (this.db.users.isUsernameTaken(form.username, editId)) {
      errors.username = "Username sudah dipakai.";
    }
    if (!form.email.trim()) errors.email = "Email wajib diisi.";
    else if (!EMAIL_PATTERN.test(form.email)) errors.email = "Format email tidak valid.";
    if (!editId && !form.password) errors.password = "Password wajib diisi untuk pengguna baru.";
    return errors;
  }

  save(form: UserForm, editId?: string): { success: boolean; errors: UserErrors } {
    const errors = this.validate(form, editId);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    const existing = editId ? this.db.users.findById(editId) : undefined;
    if (existing) {
      existing.update({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        active: form.active,
        avatar: form.avatar,
        newPassword: form.password || undefined,
      });
      this.db.users.touch();
    } else {
      this.db.users.save(
        new User({
          id: createId("usr"),
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          active: form.active,
          avatar: form.avatar || undefined,
        }),
      );
    }
    return { success: true, errors: {} };
  }
}
