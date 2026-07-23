// Ported from covers.jsx — downscales an uploaded photo client-side to a
// small JPEG data URL before it's stored on the card's cover field.
export function downscaleImage(file: File, max: number): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); rej(new Error("no 2d context")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        res(cv.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        rej(e);
      }
    };
    img.onerror = rej;
    img.src = url;
  });
}
