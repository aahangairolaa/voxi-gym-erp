"use client";
/**
 * Draws invoices and membership cards on a canvas and turns them into PDF / PNG
 * files that can be emailed or shared on WhatsApp. Drawing in the browser means
 * Arabic text is shaped correctly by the device's own fonts.
 */
import QRCode from "qrcode";
import { formatDate, formatDateTime, formatQAR } from "@/lib/format";
import { jpegPagesToPdf } from "@/lib/pdf";
import { L, METHOD, amountInWords, invoiceLines, memberName, type InvoiceData } from "./invoice-model";

const FONT = `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", "Geeza Pro", Tahoma, sans-serif`;
const INK = "#15122b";
const MUTED = "#6e6a88";
const LINE = "#e8e5f2";

function loadImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type Ctx = CanvasRenderingContext2D;
function text(ctx: Ctx, s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: string; align?: CanvasTextAlign; rtl?: boolean; max?: number; mono?: boolean } = {}) {
  ctx.font = `${o.bold ? "600 " : ""}${o.size ?? 22}px ${o.mono ? "ui-monospace, Menlo, Consolas, monospace" : FONT}`;
  ctx.fillStyle = o.color ?? INK;
  ctx.textAlign = o.align ?? "left";
  ctx.direction = o.rtl ? "rtl" : "ltr";
  ctx.textBaseline = "alphabetic";
  let out = s;
  if (o.max) while (out.length > 1 && ctx.measureText(out).width > o.max) out = out.slice(0, -2) + "…";
  ctx.fillText(out, x, y);
  ctx.direction = "ltr";
}

/** Wrap text to lines no wider than `max`. */
function wrap(ctx: Ctx, s: string, max: number, size: number) {
  ctx.font = `${size}px ${FONT}`;
  const out: string[] = [];
  let line = "";
  for (const w of s.split(/\s+/)) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawImageContain(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, alignRight = false) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, alignRight ? x + w - dw : x, y + (h - dh) / 2, dw, dh);
}

/** A4 invoice at 150 dpi (1240 × 1754 px). */
export async function drawInvoice(data: InvoiceData): Promise<HTMLCanvasElement> {
  const W = 1240;
  const H = 1754;
  const M = 90;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  const { payment: p, settings: s } = data;
  const accent = s?.brandColor ?? "#6a44f2";
  const { lines, subtotal, discount } = invoiceLines(p);

  // Header band
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 10);

  let y = 90;
  const logo = await loadImage(s?.logo);
  if (logo) drawImageContain(ctx, logo, M, y, 260, 90);
  else text(ctx, s?.name ?? "VOXI", M, y + 60, { size: 44, bold: true });
  y += 125;
  text(ctx, s?.legalName ?? s?.name ?? "", M, y, { size: 24, bold: true, max: 560 });
  for (const l of [s?.address, [s?.phone, s?.email].filter(Boolean).join(" · "), s?.website, s?.crNumber ? `${L.cr[0]} ${s.crNumber} · ${L.cr[1]}` : null].filter(Boolean) as string[]) {
    for (const w of wrap(ctx, l, 560, 19).slice(0, 2)) {
      y += 28;
      text(ctx, w, M, y, { size: 19, color: MUTED });
    }
  }

  // Title block (right)
  const R = W - M;
  text(ctx, `${L.title[0].toUpperCase()} · ${L.receipt[0].toUpperCase()}`, R, 120, { size: 20, bold: true, color: accent, align: "right" });
  text(ctx, `${L.title[1]} / ${L.receipt[1]}`, R, 156, { size: 24, bold: true, color: accent, align: "right", rtl: true });
  text(ctx, p.invoiceNo, R, 214, { size: 44, bold: true, align: "right", mono: true });
  text(ctx, `${L.date[0]}: ${formatDateTime(p.paidAt)}`, R, 254, { size: 19, color: MUTED, align: "right" });
  text(ctx, L.date[1], R, 284, { size: 18, color: MUTED, align: "right", rtl: true });

  // Billed to / payment box
  y = Math.max(y, 300) + 40;
  const boxH = 230;
  roundRect(ctx, M, y, W - 2 * M, boxH, 24, "#f5f2ff");
  const bx = M + 34;
  text(ctx, `${L.billedTo[0].toUpperCase()}  ·  ${L.billedTo[1]}`, bx, y + 46, { size: 16, bold: true, color: MUTED });
  if (p.member) {
    text(ctx, memberName(p.member), bx, y + 88, { size: 28, bold: true, max: 480 });
    const rows = [`${L.member[0]} ${p.member.code}`, p.member.phone, p.member.email, p.member.qid ? `${L.qid[0]} ${p.member.qid}` : null].filter(Boolean) as string[];
    rows.forEach((r, i) => text(ctx, r, bx, y + 124 + i * 27, { size: 19, color: MUTED, max: 480 }));
  } else {
    text(ctx, `${L.walkIn[0]} · ${L.walkIn[1]}`, bx, y + 88, { size: 26, bold: true });
  }
  const px = W - M - 34;
  text(ctx, `${L.payment[1]}  ·  ${L.payment[0].toUpperCase()}`, px, y + 46, { size: 16, bold: true, color: MUTED, align: "right" });
  const method = METHOD[p.method] ?? [p.method, ""];
  text(ctx, method[0], px, y + 88, { size: 26, bold: true, align: "right" });
  if (method[1]) text(ctx, method[1], px, y + 122, { size: 20, color: MUTED, align: "right", rtl: true });
  let py = y + 156;
  if (p.reference) {
    text(ctx, `${L.ref[0]} ${p.reference}`, px, py, { size: 19, color: MUTED, align: "right", max: 420 });
    py += 27;
  }
  if (p.receivedBy) text(ctx, `${L.receivedBy[0]} ${p.receivedBy.name}`, px, py, { size: 19, color: MUTED, align: "right", max: 420 });

  // Lines table
  y += boxH + 70;
  const colQty = 720;
  const colUnit = 900;
  const colAmt = R;
  const head = (l: readonly [string, string], x: number, align: CanvasTextAlign) => {
    text(ctx, l[0].toUpperCase(), x, y, { size: 16, bold: true, align });
    text(ctx, l[1], x, y + 26, { size: 16, color: MUTED, align, rtl: true });
  };
  ctx.direction = "ltr";
  head(L.description, M, "left");
  head(L.qty, colQty, "center");
  head(L.unit, colUnit + 40, "right");
  head(L.amount, colAmt, "right");
  y += 42;
  ctx.fillStyle = INK;
  ctx.fillRect(M, y, W - 2 * M, 3);
  for (const l of lines) {
    y += 52;
    text(ctx, l.title, M, y, { size: 23, bold: true, max: 560 });
    text(ctx, String(l.qty), colQty, y, { size: 22, align: "center" });
    text(ctx, formatQAR(l.unit), colUnit + 40, y, { size: 22, align: "right" });
    text(ctx, formatQAR(l.amount), colAmt, y, { size: 23, bold: true, align: "right" });
    if (l.detail) {
      for (const w of wrap(ctx, l.detail, 560, 18).slice(0, 2)) {
        y += 30;
        text(ctx, w, M, y, { size: 18, color: MUTED });
      }
    }
    y += 30;
    ctx.fillStyle = LINE;
    ctx.fillRect(M, y, W - 2 * M, 2);
  }

  // Totals
  y += 60;
  const tl = 760;
  // Each row: English label with the Arabic beneath, value on the right
  const totalRow = (label: readonly [string, string], value: string, big = false) => {
    text(ctx, label[0], tl, y, { size: big ? 26 : 20, bold: big, color: big ? INK : MUTED });
    text(ctx, label[1], tl, y + (big ? 32 : 26), { size: big ? 20 : 16, color: MUTED });
    text(ctx, value, R, y, { size: big ? 28 : 20, bold: big, color: big ? INK : MUTED, align: "right" });
  };
  const wordsTop = y;
  totalRow(L.subtotal, formatQAR(subtotal));
  if (discount > 0) {
    y += 62;
    totalRow(L.discount, `− ${formatQAR(discount)}`);
  }
  y += 62;
  totalRow(L.vat, L.vatNa[0]);
  y += 44;
  ctx.fillStyle = INK;
  ctx.fillRect(tl, y, R - tl, 3);
  y += 46;
  totalRow(p.status === "REFUNDED" ? L.refunded : L.totalPaid, formatQAR(p.amount), true);

  // Amount in words (left)
  text(ctx, `${L.inWords[0].toUpperCase()} · ${L.inWords[1]}`, M, wordsTop, { size: 15, bold: true, color: MUTED });
  wrap(ctx, amountInWords(p.amount), 560, 20)
    .slice(0, 3)
    .forEach((w, i) => text(ctx, w, M, wordsTop + 34 + i * 28, { size: 20, bold: true }));

  if (p.status === "REFUNDED") {
    ctx.save();
    ctx.translate(W - 260, 420);
    ctx.rotate((25 * Math.PI) / 180);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 6;
    ctx.strokeRect(-170, -45, 340, 80);
    text(ctx, "REFUNDED", 0, 18, { size: 50, bold: true, color: "#f43f5e", align: "center" });
    ctx.restore();
  }

  // Footer
  let fy = H - 230;
  ctx.fillStyle = LINE;
  ctx.fillRect(M, fy, W - 2 * M, 2);
  fy += 44;
  if (s?.invoiceFooter) {
    for (const w of wrap(ctx, s.invoiceFooter, W - 2 * M, 18).slice(0, 2)) {
      text(ctx, w, W / 2, fy, { size: 18, color: MUTED, align: "center" });
      fy += 28;
    }
  }
  text(ctx, L.thanks[0], W / 2, fy, { size: 18, color: MUTED, align: "center" });
  text(ctx, L.thanks[1], W / 2, fy + 28, { size: 18, color: MUTED, align: "center" });
  text(ctx, `${L.computer[0]}  ·  ${L.computer[1]}`, W / 2, fy + 60, { size: 14, color: MUTED, align: "center" });
  text(ctx, "POWERED BY VOXI", W / 2, H - 50, { size: 14, color: "#b7b2cc", align: "center" });
  return c;
}

export type CardData = {
  gym: { name: string; logo: string | null; brandColor: string | null };
  name: string;
  code: string;
  photoUrl: string | null;
  qrValue: string;
  membership: { plan: string; endDate: string; ok: boolean; statusLabel: string } | null;
};

/** Membership card, phone-shaped (1080 × 1600 px). */
export async function drawCard(d: CardData): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1600;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const color = d.gym.brandColor ?? "#6a44f2";
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, "#1c1442");
  bg.addColorStop(1, "#0d0a1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, W);
  glow.addColorStop(0, `${color}cc`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const M = 80;
  const logo = await loadImage(d.gym.logo);
  roundRect(ctx, M, 80, 120, 120, 28, logo ? "#ffffff" : "rgba(255,255,255,0.15)");
  if (logo) drawImageContain(ctx, logo, M + 12, 92, 96, 96);
  else text(ctx, d.gym.name.slice(0, 1), M + 60, 162, { size: 60, bold: true, color: "#fff", align: "center" });
  text(ctx, d.gym.name, M + 150, 135, { size: 40, bold: true, color: "#fff", max: W - M * 2 - 150 });
  text(ctx, "MEMBER CARD", M + 150, 182, { size: 24, bold: true, color: "rgba(255,255,255,0.6)" });

  // Photo or initials
  const photo = await loadImage(d.photoUrl);
  const cy = 330;
  ctx.save();
  ctx.beginPath();
  ctx.arc(M + 90, cy, 90, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.clip();
  if (photo) {
    const s = Math.max(180 / photo.naturalWidth, 180 / photo.naturalHeight);
    ctx.drawImage(photo, M + 90 - (photo.naturalWidth * s) / 2, cy - (photo.naturalHeight * s) / 2, photo.naturalWidth * s, photo.naturalHeight * s);
  } else {
    const initials = d.name.split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
    text(ctx, initials, M + 90, cy + 24, { size: 64, bold: true, color: "#fff", align: "center" });
  }
  ctx.restore();
  text(ctx, d.name, M + 220, cy - 8, { size: 52, bold: true, color: "#fff", max: W - M * 2 - 220 });
  text(ctx, d.code, M + 220, cy + 46, { size: 32, color: "rgba(255,255,255,0.7)", mono: true });

  // QR
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, d.qrValue, { width: 560, margin: 2, errorCorrectionLevel: "M", color: { dark: "#15122b", light: "#ffffff" } });
  roundRect(ctx, (W - 620) / 2, 500, 620, 620, 40, "#ffffff");
  ctx.drawImage(qr, (W - 560) / 2, 530, 560, 560);
  text(ctx, "Show this code at reception to check in", W / 2, 1180, { size: 28, color: "rgba(255,255,255,0.65)", align: "center" });

  // Plan
  roundRect(ctx, M, 1250, W - 2 * M, 180, 36, "rgba(255,255,255,0.1)");
  text(ctx, "PLAN", M + 44, 1310, { size: 22, bold: true, color: "rgba(255,255,255,0.6)" });
  text(ctx, d.membership?.plan ?? "No active plan", M + 44, 1370, { size: 38, bold: true, color: "#fff", max: 480 });
  text(ctx, d.membership ? "VALID UNTIL" : "STATUS", W - M - 44, 1310, { size: 22, bold: true, color: "rgba(255,255,255,0.6)", align: "right" });
  text(ctx, d.membership ? (d.membership.ok ? formatDate(d.membership.endDate) : d.membership.statusLabel) : "–", W - M - 44, 1370, {
    size: 38,
    bold: true,
    color: d.membership?.ok ? "#6ee7b7" : "#fcd34d",
    align: "right",
  });
  text(ctx, "Powered by VOXI", W / 2, H - 70, { size: 22, color: "rgba(255,255,255,0.35)", align: "center" });
  return c;
}

async function canvasJpeg(c: HTMLCanvasElement, quality = 0.9) {
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't create the file on this device.");
  return new Uint8Array(await blob.arrayBuffer());
}

/** One-page PDF of a canvas. `widthPt` sets the page width in points (A4 = 595.28). */
export async function canvasToPdf(c: HTMLCanvasElement, widthPt: number): Promise<Blob> {
  const jpeg = await canvasJpeg(c);
  const pdf = jpegPagesToPdf([{ jpeg, px: { w: c.width, h: c.height }, pt: { w: widthPt, h: (widthPt * c.height) / c.width } }]);
  return new Blob([pdf as BlobPart], { type: "application/pdf" });
}

export async function canvasToPng(c: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Couldn't create the image on this device.");
  return blob;
}

export const invoicePdf = async (data: InvoiceData) => canvasToPdf(await drawInvoice(data), 595.28);
export const cardPdf = async (d: CardData) => canvasToPdf(await drawCard(d), 360);

/** Save a file to the device (Downloads). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
