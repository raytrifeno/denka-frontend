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
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { cn } from "./ui/utils";
import type { ProductCategory } from "../../domain/entities/Product";
import { LABEL_PAYMENT_METHOD, type PaymentMethod } from "../../domain/entities/Sale";
import { SaleController } from "../../domain/controllers/SaleController";
import { SettingsController } from "../../domain/controllers/SettingsController";
import type { Sale } from "../../domain/entities/Sale";
import { useController } from "../hooks/use-controller";
import { printHTML, sendReceiptPdfWhatsApp, type ReceiptData } from "../share";
import { KATEGORI_FOTO } from "../kategori-foto";
import { toast } from "sonner";

const CATEGORIES: { id: "all" | ProductCategory; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "laptop", label: "Laptop" },
  { id: "pc", label: "PC & Komponen" },
  { id: "aksesoris", label: "Aksesoris" },
  { id: "sparepart", label: "Sparepart" },
  { id: "lainnya", label: "Lainnya" },
];

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

function receiptHTML(sale: Sale): string {
  const settings = SettingsController.getInstance();
  const store = settings.store;
  const receipt = settings.receipt;
  const rows = sale.items
    .map((i) => `<div class="row"><span>${i.quantity}× ${esc(i.productName)}</span><span>${rupiah(i.subtotal())}</span></div>`)
    .join("");
  const cashRows = sale.method === "tunai"
    ? `<div class="row"><span class="muted">Tunai</span><span>${rupiah(sale.amountPaid)}</span></div>
       <div class="row"><span class="muted">Kembalian</span><span>${rupiah(sale.change())}</span></div>`
    : "";
  return `
    <h1>${esc(store.name)}</h1>
    ${receipt.showAddress ? `<p class="center muted">${esc(store.address)}<br>${esc(store.phone)}</p>` : ""}
    <hr>
    <div class="row"><span class="muted">No.</span><span>${esc(sale.number)}</span></div>
    <div class="row"><span class="muted">Kasir</span><span>${esc(sale.cashier)}</span></div>
    <div class="row"><span class="muted">Tanggal</span><span>${sale.date.toLocaleString("id-ID")}</span></div>
    <hr>
    ${rows}
    <hr>
    <div class="row"><span class="muted">Subtotal</span><span>${rupiah(sale.subtotal())}</span></div>
    ${sale.discount() > 0 ? `<div class="row"><span class="muted">Diskon</span><span>- ${rupiah(sale.discount())}</span></div>` : ""}
    <div class="row total"><span>TOTAL</span><span>${rupiah(sale.total())}</span></div>
    ${cashRows}
    <hr>
    <p class="center muted">${esc(receipt.footer)}</p>`;
}

// Data struk terstruktur untuk dikirim ke layanan (dirender jadi PDF).
function receiptData(sale: Sale): ReceiptData {
  const settings = SettingsController.getInstance();
  const store = settings.store;
  return {
    store: {
      name: store.name,
      address: store.address,
      phone: store.phone,
      showAddress: settings.receipt.showAddress,
    },
    number: sale.number,
    cashier: sale.cashier,
    date: sale.date.toLocaleString("id-ID"),
    items: sale.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPrice,
      subtotal: i.subtotal(),
    })),
    subtotal: sale.subtotal(),
    discount: sale.discount(),
    total: sale.total(),
    method: LABEL_PAYMENT_METHOD[sale.method],
    isCash: sale.method === "tunai",
    amountPaid: sale.amountPaid,
    change: sale.change(),
    footer: settings.receipt.footer,
  };
}

/**
 * POS — boundary class Point of Sale.
 * Keranjang, diskon, dan pembayaran seluruhnya dikelola SaleController;
 * komponen ini hanya state tampilan (pencarian, kategori, dialog struk).
 */
export function POS() {
  const controller = SaleController.getInstance();
  useController(controller);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [failMessage, setFailMessage] = useState<string | null>(null);

  const filtered = controller.catalog(search, category);
  const cart = controller.cart;

  const subtotal = controller.subtotal();
  const discount = controller.discount();
  const total = controller.total();
  const change = controller.change();
  const cartCount = controller.itemCount();
  const payment = controller.method;
  const cashReceived = controller.amountPaid;

  function pay() {
    const result = controller.processPayment();
    if (result.success) {
      setFailMessage(null);
      setCartOpen(false);
      setConfirmOpen(true);
    } else {
      setFailMessage(result.message ?? "Pembayaran gagal.");
    }
  }

  function newTransaction() {
    controller.newSale();
    setConfirmOpen(false);
  }

  const sale = controller.lastSale;

  const [waSending, setWaSending] = useState(false);
  async function sendReceiptWA() {
    if (!sale) return;
    const phone = sale.customerWhatsapp ?? "";
    if (!phone) {
      toast.error("Nomor WhatsApp pelanggan kosong. Isi di panel pembayaran sebelum pay.");
      return;
    }
    setWaSending(true);
    try {
      await sendReceiptPdfWhatsApp(phone, receiptData(sale));
      toast.success("Struk PDF terkirim via WhatsApp.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim struk.");
    } finally {
      setWaSending(false);
    }
  }

  const cartInner = (
    <>
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
              <div key={item.product.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm text-foreground">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{rupiah(item.product.sellPrice)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => controller.removeFromCart(item.product.id)}
                    aria-label="Hapus item"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <StepBtn label="Kurangi" onClick={() => controller.changeQuantity(item.product.id, -1)}>
                      <Minus className="size-3.5" />
                    </StepBtn>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <StepBtn
                      label="Tambah"
                      disabled={item.quantity >= item.product.stock}
                      onClick={() => controller.changeQuantity(item.product.id, 1)}
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
                  onClick={() => controller.setDiscount("rp", controller.discountValue)}
                  className={cn("px-2 py-1 text-xs transition-colors", controller.discountType === "rp" ? "bg-primary-700 text-white" : "text-muted-foreground hover:bg-muted")}
                >Rp</button>
                <button
                  type="button"
                  onClick={() => controller.setDiscount("percent", controller.discountValue)}
                  className={cn("px-2 py-1 text-xs transition-colors", controller.discountType === "percent" ? "bg-primary-700 text-white" : "text-muted-foreground hover:bg-muted")}
                >%</button>
              </div>
              <Input
                type="number" min={0}
                value={controller.discountValue || ""}
                onChange={(e) => controller.setDiscount(controller.discountType, Math.max(0, Number(e.target.value)))}
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
            <Select value={payment} onValueChange={(v) => controller.setMethod(v as PaymentMethod)}>
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
                onChange={(e) => controller.setAmountPaid(Math.max(0, Number(e.target.value)))}
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

          {failMessage && <p className="text-xs text-destructive">{failMessage}</p>}

          <button
            type="button"
            disabled={!controller.canPay()}
            onClick={pay}
            className="flex h-12 w-full items-center justify-center rounded-md bg-amber font-bold text-primary-900 transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proses Pembayaran
          </button>
        </div>
      )}
    </>
  );

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
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <Search className="mb-2 size-8 opacity-40" />
              <p className="text-sm">Barang tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const out = p.stock === 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => controller.addToCart(p.id)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all",
                      out
                        ? "cursor-not-allowed opacity-50 grayscale"
                        : "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                    )}
                  >
                    {/* photo */}
                    <div className="relative aspect-[4/3] bg-muted">
                      <img
                        src={KATEGORI_FOTO[p.category]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
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
                      <p className="line-clamp-2 font-semibold text-foreground">{p.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.specification ?? ""}</p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
                        <span className="font-display tnum whitespace-nowrap text-[15px] font-bold text-primary-900">{rupiah(p.sellPrice)}</span>
                        {!out && <Badge variant="secondary" className="shrink-0">Stok: {p.stock}</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — cart panel (desktop) */}
      <div className="hidden w-[32%] max-w-md shrink-0 flex-col border-l border-border bg-card lg:flex">
        {cartInner}
      </div>

      {/* Mobile — bar checkout + drawer keranjang */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card p-3 lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label="Buka keranjang"
          className="relative flex size-11 shrink-0 items-center justify-center rounded-md border border-border"
        >
          <ShoppingCart className="size-5 text-primary-700" />
          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-bold text-primary-900">
              {cartCount}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display tnum truncate text-lg font-bold text-primary-900">{rupiah(total)}</p>
        </div>
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => setCartOpen(true)}
          className="flex h-11 items-center rounded-md bg-amber px-5 font-bold text-primary-900 transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Keranjang
        </button>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="flex w-full max-w-md flex-col p-0">
          <SheetTitle className="sr-only">Keranjang</SheetTitle>
          {cartInner}
        </SheetContent>
      </Sheet>

      {/* confirmation modal — menampilkan entity TransaksiPenjualan tersimpan */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) newTransaction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-center">Pembayaran Berhasil</DialogTitle>
            <DialogDescription className="text-center">
              Transaksi {sale?.number ?? ""} telah tercatat. Berikut ringkasannya.
            </DialogDescription>
          </DialogHeader>

          {sale && (
            <div className="rounded-lg border border-border">
              <div className="max-h-48 overflow-y-auto p-3">
                {sale.items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-2 py-1 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">{item.quantity}× {item.productName}</span>
                    <span>{rupiah(item.subtotal())}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 p-3 text-sm">
                <Row label="Subtotal" value={rupiah(sale.subtotal())} />
                {sale.discount() > 0 && <Row label="Diskon" value={"- " + rupiah(sale.discount())} />}
                <Row label="Kasir" value={sale.cashier} />
                <Row label="Metode" value={LABEL_PAYMENT_METHOD[sale.method]} />
                {sale.method === "tunai" && (
                  <>
                    <Row label="Uang Diterima" value={rupiah(sale.amountPaid)} />
                    <Row label="Kembalian" value={rupiah(sale.change())} />
                  </>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-display tnum text-lg font-bold text-primary-900">{rupiah(sale.total())}</span>
                </div>
              </div>
              <Separator />
              <p className="p-3 text-center text-xs text-muted-foreground">
                {SettingsController.getInstance().receipt.footer}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => sale && printHTML(receiptHTML(sale))}>
              <Printer className="size-4" />
              Cetak Struk
            </Button>
            <Button variant="outline" onClick={sendReceiptWA} disabled={waSending}>
              <MessageCircle className="size-4 text-success" />
              {waSending ? "Mengirim..." : "Kirim via WhatsApp"}
            </Button>
          </div>
          <Button className="w-full bg-primary-700 text-white hover:bg-primary-500" onClick={newTransaction}>
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
