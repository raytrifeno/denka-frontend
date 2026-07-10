# Denka Frontend

Aplikasi kasir & service Denka Computer — desktop/mobile app dengan **Tauri v2** + React + TypeScript. Data bekerja **offline** di SQLite lokal; saat online bisa disinkronkan ke Supabase (lihat repo `denka-backend`).

## Menjalankan

```bash
pnpm install
pnpm dev            # buka di browser (data pakai localStorage)
pnpm tauri dev      # jalankan sebagai desktop app (data pakai SQLite)
```

Untuk `pnpm tauri dev` di Linux perlu dependensi sistem:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Sinkronisasi Supabase (opsional)

Salin `.env.example` menjadi `.env`, lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

## Struktur

- `src/domain` — entity, controller, repository (OOP: boundary–controller–entity)
- `src/domain/persistence` — penyimpanan lokal (SQLite di Tauri, localStorage di browser)
- `src/domain/sync` — client Supabase
- `src/app` — komponen UI (boundary)
- `src-tauri` — shell Tauri (Rust)

Login demo: `budi@denkacomputer.id` / `denka123`.
