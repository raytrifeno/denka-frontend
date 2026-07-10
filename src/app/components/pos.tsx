import { useState } from "react";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Printer,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "./ui/utils";
import type { KategoriBarang } from "../../domain/entities/Barang";
import { LABEL_METODE, type MetodePembayaran } from "../../domain/entities/TransaksiPenjualan";
import { TransaksiController } from "../../domain/controllers/TransaksiController";
import { PengaturanController } from "../../domain/controllers/PengaturanController";
import { useController } from "../hooks/use-controller";

const CATEGORIES: { id: "all" | KategoriBarang; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "laptop", label: "Laptop" },
  { id: "pc", label: "PC & Komponen" },
  { id: "aksesoris", label: "Aksesoris" },
  { id: "sparepart", label: "Sparepart" },
  { id: "lainnya", label: "Lainnya" },
];

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

/**
 * POS — boundary class Point of Sale.
 * Keranjang, diskon, dan pembayaran seluruhnya dikelola TransaksiController;
 * komponen ini hanya state tampilan (pencarian, kategori, dialog struk).
 */
export function POS() {
  const controller = TransaksiController.getInstance();
  useController(controller);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | KategoriBarang>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);

  const filtered = controller.katalog(search, category);
  const cart = controller.keranjang;

  const subtotal = controller.subtotal();
  const discount = controller.diskon();
  const total = controller.total();
  const change = controller.kembalian();
  const cartCount = controller.jumlahItem();
  const payment = controller.metode;
  const cashReceived = controller.uangDiterima;

  function bayar() {
    const hasil = controller.prosesPembayaran();
    if (hasil.sukses) {
      setPesanGagal(null);
      setConfirmOpen(true);
    } else {
      setPesanGagal(hasil.pesan ?? "Pembayaran gagal.");
    }
  }

  function transaksiBaru() {
    controller.transaksiBaru();
    setConfirmOpen(false);
  }

  const trx = controller.transaksiTerakhir;

  return (
    <div className="flex h-full">
      {/* LEFT — catalog (68%) */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
        <div className="mb-4">
          <h1>Transaksi Penjualan</h1>
        </div>

        {/* search */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau scan barcode..."
            className="h-11 bg-card pl-11 pr-12"
          />
          <button
            type="button"
            aria-label="Scan barcode"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors hover:bg-primary-100"
          >
            <ScanLine className="size-5" />
          </button>
        </div>

        {/* category chips */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                category === c.id
                  ? "border-primary-700 bg-primary-700 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-primary-500 hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* product grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <Search className="mb-2 size-8 opacity-40" />
              <p className="text-sm">Barang tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const out = p.stok === 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => controller.tambahKeKeranjang(p.id)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all",
                      out
                        ? "cursor-not-allowed opacity-50 grayscale"
                        : "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                    )}
                  >
                    {/* photo */}
                    <div className="relative aspect-[4/3] bg-muted">
                      <div className="flex h-full items-center justify-center text-muted-foreground/40">
                        <ShoppingCart className="size-8" />
                      </div>
                      {out && (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/45">
                          <span className="rounded-md bg-foreground/80 px-2.5 py-1 text-xs text-background">
                            Stok Habis
                          </span>
                        </div>
                      )}
                    </div>
                    {/* info */}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 font-semibold text-foreground">{p.nama}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.spesifikasi ?? ""}</p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
                        <span className="font-display tnum whitespace-nowrap text-[15px] font-bold text-primary-900">{rupiah(p.hargaJual)}</span>
                        {!out && <Badge variant="secondary" className="shrink-0">Stok: {p.stok}</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — cart (32%) fixed */}
      <div className="hidden w-[32%] max-w-md shrink-0 flex-col border-l border-border bg-card lg:flex">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary-700" />
            <h2>Keranjang</h2>
          </div>
          {cartCount > 0 && <Badge variant="secondary">{cartCount} item</Badge>}
        </div>

        {/* items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.barang.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm text-foreground">{item.barang.nama}</p>
                      <p className="text-xs text-muted-foreground">{rupiah(item.barang.hargaJual)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => controller.hapusDariKeranjang(item.barang.id)}
                      aria-label="Hapus item"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StepBtn label="Kurangi" onClick={() => controller.ubahJumlah(item.barang.id, -1)}>
                        <Minus className="size-3.5" />
                      </StepBtn>
                      <span className="w-8 text-center text-sm">{item.jumlah}</span>
                      <StepBtn
                        label="Tambah"
                        disabled={item.jumlah >= item.barang.stok}
                        onClick={() => controller.ubahJumlah(item.barang.id, 1)}
                      >
                        <Plus className="size-3.5" />
                      </StepBtn>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {rupiah(item.subtotal())}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* summary */}
        {cart.length > 0 && (
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Diskon</span>
              <div className="flex items-center gap-1">
                <div className="flex overflow-hidden rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => controller.setDiskon("rp", controller.nilaiDiskon)}
                    className={cn("px-2 py-1 text-xs transition-colors", controller.tipeDiskon === "rp" ? "bg-primary-700 text-white" : "text-muted-foreground hover:bg-muted")}
                  >Rp</button>
                  <button
                    type="button"
                    onClick={() => controller.setDiskon("percent", controller.nilaiDiskon)}
                    className={cn("px-2 py-1 text-xs transition-colors", controller.tipeDiskon === "percent" ? "bg-primary-700 text-white" : "text-muted-foreground hover:bg-muted")}
                  >%</button>
                </div>
                <Input
                  type="number" min={0}
                  value={controller.nilaiDiskon || ""}
                  onChange={(e) => controller.setDiskon(controller.tipeDiskon, Math.max(0, Number(e.target.value)))}
                  className="h-8 w-20 text-right"
                  placeholder="0"
                />
              </div>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-success">
                <span>Potongan</span><span>- {rupiah(discount)}</span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Akhir</span>
              <span className="font-display tnum text-[1.75rem] font-bold leading-none tracking-tight text-primary-900">{rupiah(total)}</span>
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={payment} onValueChange={(v) => controller.setMetode(v as MetodePembayaran)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payment === "tunai" && (
              <div className="space-y-2">
                <Label>Uang Diterima</Label>
                <Input
                  type="number" min={0}
                  value={cashReceived || ""}
                  onChange={(e) => controller.setUangDiterima(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                />
                <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className={cn(cashReceived >= total ? "font-semibold text-success" : "text-destructive")}>
                    {cashReceived >= total ? rupiah(change) : "Uang kurang"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>No. WhatsApp Pelanggan (opsional)</Label>
              <Input
                type="tel"
                value={controller.whatsapp}
                onChange={(e) => controller.setWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {pesanGagal && <p className="text-xs text-destructive">{pesanGagal}</p>}

            <button
              type="button"
              disabled={!controller.bisaBayar()}
              onClick={bayar}
              className="flex h-12 w-full items-center justify-center rounded-md bg-amber font-bold text-primary-900 transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proses Pembayaran
            </button>
          </div>
        )}
      </div>

      {/* confirmation modal — menampilkan entity TransaksiPenjualan tersimpan */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) transaksiBaru(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-center">Pembayaran Berhasil</DialogTitle>
            <DialogDescription className="text-center">
              Transaksi {trx?.nomor ?? ""} telah tercatat. Berikut ringkasannya.
            </DialogDescription>
          </DialogHeader>

          {trx && (
            <div className="rounded-lg border border-border">
              <div className="max-h-48 overflow-y-auto p-3">
                {trx.items.map((item) => (
                  <div key={item.barangId} className="flex justify-between gap-2 py-1 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">{item.jumlah}× {item.namaBarang}</span>
                    <span>{rupiah(item.subtotal())}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 p-3 text-sm">
                <Row label="Subtotal" value={rupiah(trx.subtotal())} />
                {trx.diskon() > 0 && <Row label="Diskon" value={"- " + rupiah(trx.diskon())} />}
                <Row label="Kasir" value={trx.kasir} />
                <Row label="Metode" value={LABEL_METODE[trx.metode]} />
                {trx.metode === "tunai" && (
                  <>
                    <Row label="Uang Diterima" value={rupiah(trx.uangDiterima)} />
                    <Row label="Kembalian" value={rupiah(trx.kembalian())} />
                  </>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-display tnum text-lg font-bold text-primary-900">{rupiah(trx.total())}</span>
                </div>
              </div>
              <Separator />
              <p className="p-3 text-center text-xs text-muted-foreground">
                {PengaturanController.getInstance().struk.footer}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">
              <Printer className="size-4" />
              Cetak Struk
            </Button>
            <Button variant="outline">
              <MessageCircle className="size-4 text-success" />
              Kirim via WhatsApp
            </Button>
          </div>
          <Button className="w-full bg-primary-700 text-white hover:bg-primary-500" onClick={transaksiBaru}>
            Transaksi Baru
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepBtn({
  children, label, disabled, onClick,
}: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-primary-500 hover:bg-muted active:bg-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyCart() {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
      <svg
        className="mb-3 size-16 text-muted-foreground/40"
        viewBox="0 0 64 64" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M10 14h6l5 30h28l5-22H20" />
        <circle cx="26" cy="52" r="3.5" />
        <circle cx="46" cy="52" r="3.5" />
      </svg>
      <p className="text-sm text-foreground">Belum ada barang dipilih</p>
      <p className="text-xs text-muted-foreground">Klik kartu barang untuk menambahkan.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
