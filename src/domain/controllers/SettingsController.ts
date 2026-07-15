import { Observable } from "../core/Observable";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import { LocalStore } from "../persistence/LocalStore";

export interface StoreProfile {
  name: string;
  address: string;
  phone: string;
}

export interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  footer: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  template: string;
  // whatsapp-web.js service URL. Empty = default (VITE_WHATSAPP_URL / localhost).
  // On a phone, set the LAN IP of the PC running the Denka desktop app.
  serverUrl?: string;
}

interface SettingsData {
  store: StoreProfile;
  receipt: ReceiptSettings;
  whatsapp: WhatsAppSettings;
  extraCategories: string[];
}

const KEY_SETTINGS = "denka-settings";

const DEFAULTS: SettingsData = {
  store: {
    name: "Denka Computer",
    address: "Jl. Teknologi No. 17, Jakarta Selatan",
    phone: "021-12345678",
  },
  receipt: {
    showLogo: true,
    showAddress: true,
    footer: "Terima kasih telah berbelanja di Denka Computer!",
  },
  whatsapp: {
    enabled: true,
    template:
      "Halo {nama_pelanggan}, terima kasih telah berbelanja di {nama_toko}. Transaksi {no_transaksi} sebesar {total_belanja} telah berhasil. Struk digital terlampir.",
    serverUrl: "",
  },
  extraCategories: [],
};

/**
 * SettingsController — app preferences (store profile, receipt, WhatsApp,
 * extra categories) persisted in local storage, plus data maintenance actions
 * (reset demo data).
 */
export class SettingsController extends Observable {
  private static instance: SettingsController | null = null;

  private data: SettingsData;

  private constructor() {
    super();
    const stored = LocalStore.load<SettingsData>(KEY_SETTINGS);
    this.data = stored ? { ...DEFAULTS, ...stored } : { ...DEFAULTS };
  }

  static getInstance(): SettingsController {
    if (!SettingsController.instance) {
      SettingsController.instance = new SettingsController();
    }
    return SettingsController.instance;
  }

  private persist(): void {
    LocalStore.save(KEY_SETTINGS, this.data);
    this.notify();
  }

  // ----- store profile -----
  get store(): StoreProfile {
    return { ...this.data.store };
  }

  setStore(store: StoreProfile): void {
    this.data.store = { ...store };
    this.persist();
  }

  // ----- receipt -----
  get receipt(): ReceiptSettings {
    return { ...this.data.receipt };
  }

  setReceipt(receipt: ReceiptSettings): void {
    this.data.receipt = { ...receipt };
    this.persist();
  }

  // ----- whatsapp -----
  get whatsapp(): WhatsAppSettings {
    return { ...this.data.whatsapp };
  }

  setWhatsApp(settings: WhatsAppSettings): void {
    this.data.whatsapp = { ...settings };
    this.persist();
  }

  // ----- extra categories -----
  /** Five core categories + user-added extra categories. */
  get allCategories(): string[] {
    return ["Laptop", "PC & Komponen", "Aksesoris", "Sparepart", "Lainnya", ...this.data.extraCategories];
  }

  get extraCategories(): string[] {
    return [...this.data.extraCategories];
  }

  addCategory(name: string): { success: boolean; message?: string } {
    const clean = name.trim();
    if (!clean) return { success: false, message: "Nama kategori tidak boleh kosong." };
    const exists = this.allCategories.some(
      (category) => category.toLowerCase() === clean.toLowerCase(),
    );
    if (exists) return { success: false, message: "Kategori sudah ada." };
    this.data.extraCategories.push(clean);
    this.persist();
    return { success: true };
  }

  removeCategory(name: string): void {
    this.data.extraCategories = this.data.extraCategories.filter((category) => category !== name);
    this.persist();
  }

  // ----- data maintenance -----
  /** Reset all sales/stock/service data back to the initial demo state. */
  resetDemoData(): void {
    Database.getInstance().resetToInitialSeed();
    AuthController.getInstance().syncSession();
  }

  /** Reset preferences back to defaults. */
  resetSettings(): void {
    this.data = JSON.parse(JSON.stringify(DEFAULTS)) as SettingsData;
    LocalStore.remove(KEY_SETTINGS);
    this.notify();
  }
}
