/**
 * Shrink a photo in the browser before upload, so a 5 MB phone picture becomes
 * a ~30 KB JPEG. Returns a data URL ("data:image/jpeg;base64,…").
 */
export async function compressImage(
  source: Blob | HTMLVideoElement,
  opts: { size?: number; square?: boolean; quality?: number; type?: "image/jpeg" | "image/png" } = {},
): Promise<string> {
  const { size = 320, square = true, quality = 0.82, type = "image/jpeg" } = opts;

  let img: CanvasImageSource;
  let w: number;
  let h: number;
  if (source instanceof HTMLVideoElement) {
    img = source;
    w = source.videoWidth;
    h = source.videoHeight;
  } else {
    const bitmap = await createImageBitmap(source).catch(() => null);
    if (!bitmap) throw new Error("That file isn't a picture VOXI can read. Try a JPG or PNG.");
    img = bitmap;
    w = bitmap.width;
    h = bitmap.height;
  }

  // Centre-crop to a square (profile photos) or keep the shape (logos)
  let sx = 0, sy = 0, sw = w, sh = h;
  if (square) {
    const side = Math.min(w, h);
    sx = (w - side) / 2;
    sy = (h - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, size / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d")!;
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, quality);
}
