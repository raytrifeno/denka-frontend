import PDFDocument from "pdfkit";

export const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const W = 226; // ~80mm
const M = 16;
const CW = W - M * 2;

// Gambar seluruh isi struk ke `doc`. Dipakai 2x: sekali untuk mengukur tinggi,
// sekali untuk render final — agar tidak ada ruang kosong di bawah.
function renderReceipt(doc, r) {
  const hr = () => {
    const y = doc.y + 2;
    doc.save().moveTo(M, y).lineTo(W - M, y)
      .lineWidth(0.6).dash(1.5, { space: 2 }).strokeColor("#9AA3AF").stroke().restore();
    doc.y = y + 6;
    doc.x = M;
  };
  const pair = (label, val, o = {}) => {
    const size = o.size || 8;
    const y = doc.y;
    doc.font(o.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(o.color || "#111827");
    doc.text(String(label), M, y, { width: CW, lineBreak: false });
    doc.text(String(val), M, y, { width: CW, align: "right", lineBreak: false });
    doc.y = y + size + 4;
    doc.x = M;
  };

  // Header
  if (r.store?.showLogo && r.store?.logo) {
    const m = /^data:image\/\w+;base64,(.+)$/.exec(r.store.logo);
    if (m) {
      try {
        const size = 46;
        doc.image(Buffer.from(m[1], "base64"), (W - size) / 2, doc.y, { fit: [size, size], align: "center" });
        doc.y += size + 4;
        doc.x = M;
      } catch {
        // logo tak valid — lewati, tetap render struk
      }
    }
  }
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111827")
    .text((r.store?.name || "Denka").toUpperCase(), M, doc.y, { width: CW, align: "center" });
  if (r.store?.showAddress) {
    doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280");
    if (r.store.address) doc.text(r.store.address, M, doc.y, { width: CW, align: "center" });
    if (r.store.phone) doc.text(r.store.phone, M, doc.y, { width: CW, align: "center" });
  }
  doc.moveDown(0.5);
  hr();

  // Meta
  pair("No.", r.number || "-");
  pair("Kasir", r.cashier || "-");
  pair("Tanggal", r.date || "-");
  hr();

  // Items
  for (const it of (r.items || [])) {
    doc.font("Helvetica").fontSize(8.5).fillColor("#111827")
      .text(it.name || "-", M, doc.y, { width: CW });
    const y = doc.y;
    doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280")
      .text(`${it.quantity} x ${rupiah(it.price)}`, M, y, { width: CW * 0.6, lineBreak: false });
    doc.fontSize(8.5).fillColor("#111827")
      .text(rupiah(it.subtotal), M, y, { width: CW, align: "right", lineBreak: false });
    doc.y = y + 12;
    doc.x = M;
  }
  hr();

  // Totals
  pair("Subtotal", rupiah(r.subtotal));
  if (r.discount > 0) pair("Diskon", "- " + rupiah(r.discount), { color: "#16A34A" });
  doc.moveDown(0.15);
  pair("TOTAL", rupiah(r.total), { bold: true, size: 12.5 });
  doc.moveDown(0.15);
  pair("Metode", r.method || "-");
  if (r.isCash) {
    pair("Tunai", rupiah(r.amountPaid));
    pair("Kembalian", rupiah(r.change));
  }
  hr();

  // Footer
  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#6B7280")
    .text(r.footer || "Terima kasih telah berbelanja", M, doc.y, { width: CW, align: "center" });
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(6.5).fillColor("#9CA3AF")
    .text("Struk digital - Denka Computer", M, doc.y, { width: CW, align: "center" });
}

/** Render struk penjualan jadi PDF (thermal ~80mm, tinggi pas) → Buffer. */
export function buildReceiptPdf(r) {
  // Pass 1 — ukur tinggi konten pada halaman sangat tinggi.
  const probe = new PDFDocument({ size: [W, 5000], margins: { top: M, bottom: M, left: M, right: M } });
  probe.on("data", () => {});
  probe.on("error", () => {});
  renderReceipt(probe, r);
  const H = Math.ceil(probe.y + M);
  probe.end();

  // Pass 2 — render final dengan tinggi pas (tanpa ruang kosong).
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margins: { top: M, bottom: M, left: M, right: M } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderReceipt(doc, r);
    doc.end();
  });
}
