import { Entity } from "../core/Entity";

export type UserRole = "pemilik" | "admin";

export interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  lastLogin?: Date | null;
}

/**
 * User entity — a system account.
 * The password is kept private and can only be verified via checkPassword()
 * (never read directly by the boundary).
 */
export class User extends Entity {
  private _name: string;
  private _username: string;
  private _email: string;
  private _password: string;
  private _role: UserRole;
  private _active: boolean;
  private _lastLogin: Date | null;

  constructor(data: UserData) {
    super(data.id);
    this._name = data.name;
    this._username = data.username;
    this._email = data.email;
    this._password = data.password;
    this._role = data.role;
    this._active = data.active;
    this._lastLogin = data.lastLogin ?? null;
  }

  get name(): string { return this._name; }
  get username(): string { return this._username; }
  get email(): string { return this._email; }
  get role(): UserRole { return this._role; }
  get active(): boolean { return this._active; }
  get lastLogin(): Date | null { return this._lastLogin; }

  initials(): string {
    return this._name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  /** Match a login identity against username OR email. */
  matchesIdentity(identity: string): boolean {
    const id = identity.trim().toLowerCase();
    return this._username.toLowerCase() === id || this._email.toLowerCase() === id;
  }

  checkPassword(password: string): boolean {
    return this._password === password;
  }

  recordLogin(): void {
    this._lastLogin = new Date();
  }

  setActive(active: boolean): void {
    this._active = active;
  }

  /** Serialize for local storage. */
  toJSON(): UserData {
    return {
      id: this.id,
      name: this._name,
      username: this._username,
      email: this._email,
      password: this._password,
      role: this._role,
      active: this._active,
      lastLogin: this._lastLogin,
    };
  }

  static fromJSON(data: Omit<UserData, "lastLogin"> & { lastLogin?: string | Date | null }): User {
    return new User({
      ...data,
      lastLogin: data.lastLogin ? new Date(data.lastLogin) : null,
    });
  }

  update(data: {
    name: string;
    username: string;
    email: string;
    role: UserRole;
    active: boolean;
    newPassword?: string;
  }): void {
    this._name = data.name;
    this._username = data.username;
    this._email = data.email;
    this._role = data.role;
    this._active = data.active;
    if (data.newPassword) this._password = data.newPassword;
  }
}
