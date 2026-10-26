// Genera iconos: PWA (public/) y fuentes para Android (assets/) sin dependencias externas.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const assetsDir = join(root, 'assets');
mkdirSync(publicDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });

// ---------- utilidades ----------
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = clamp(c1 / c2, 0, 1);
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

// ---------- codificador PNG ----------
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- dibujo ----------
// bg: 'gradient' | 'dark' | 'transparent'
// rounded: recorta esquinas redondeadas del lienzo completo
// logo: fracción del lienzo que ocupa el "cuadrado redondeado" centrado (0 = sin logo)
// check: dibuja la marca; checkScale: tamaño de la marca relativo a size (o a logo)
function render(size, { rounded = false, bg = 'gradient', logo = 0, check = true, checkScale = 0.85 }) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = Math.max(1.2, (size / 512) * 1.2);
  const half = size / 2;
  const fullRadius = rounded ? size * 0.22 : 0;

  const logoSize = logo > 0 ? size * logo : 0;
  const logoRadius = logoSize * 0.22;
  const logoMin = (size - logoSize) / 2;

  const span = (logo > 0 ? logoSize : size) * checkScale;
  const th = span * 0.085;
  const rel = [
    [-0.23, 0.02],
    [-0.055, 0.185],
    [0.24, -0.185]
  ];
  const pts = rel.map(([rx, ry]) => [half + rx * span, half + ry * span]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      let r, g, b, alpha = 1;

      if (bg === 'transparent') {
        r = g = b = 0;
        alpha = 0;
      } else if (bg === 'gradient') {
        const t = (px + py) / (2 * (size - 1));
        r = Math.round(lerp(124, 6, t));
        g = Math.round(lerp(58, 182, t));
        b = Math.round(lerp(237, 212, t));
      } else {
        r = 14;
        g = 17;
        b = 23;
      }

      // logo: cuadrado redondeado con gradiente centrado
      if (logo > 0) {
        const d = roundedRectSDF(px, py, half, half, logoSize / 2, logoSize / 2, logoRadius);
        const logoAlpha = smoothstep(0.5, -0.5, d);
        if (logoAlpha > 0) {
          const t = (px - logoMin + (py - logoMin)) / (2 * (logoSize - 1 || 1));
          const lr = Math.round(lerp(124, 6, clamp(t, 0, 1)));
          const lg = Math.round(lerp(58, 182, clamp(t, 0, 1)));
          const lb = Math.round(lerp(237, 212, clamp(t, 0, 1)));
          r = Math.round(lerp(r, lr, logoAlpha));
          g = Math.round(lerp(g, lg, logoAlpha));
          b = Math.round(lerp(b, lb, logoAlpha));
        }
      }

      // recorte de esquinas del lienzo
      if (rounded) {
        const d = roundedRectSDF(px, py, half, half, half, half, fullRadius);
        const shape = smoothstep(0.5, -0.5, d);
        alpha *= shape;
        if (alpha <= 0) continue;
      }

      // marca blanca
      let ck = 0;
      if (check) {
        const d1 = segDist(px, py, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
        const d2 = segDist(px, py, pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        ck = smoothstep(th / 2 + aa, th / 2 - aa, Math.min(d1, d2));
      }
      if (ck > 0) {
        r = Math.round(lerp(r, 255, ck));
        g = Math.round(lerp(g, 255, ck));
        b = Math.round(lerp(b, 255, ck));
      }

      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = Math.round(255 * alpha);
    }
  }
  return rgba;
}

function write(name, size, opts) {
  const png = encodePNG(size, size, render(size, opts));
  writeFileSync(join(opts.dir, name), png);
  console.log('✔', join(opts.dir, name), `(${size}×${size}, ${png.length} bytes)`);
}

// ---------- PWA ----------
write('icon-192.png', 192, { dir: publicDir, rounded: true, bg: 'gradient' });
write('icon-512.png', 512, { dir: publicDir, rounded: true, bg: 'gradient' });
write('icon-maskable-512.png', 512, { dir: publicDir, rounded: false, bg: 'gradient' });

// ---------- Android (fuentes para @capacitor/assets) ----------
write('icon.png', 1024, { dir: assetsDir, rounded: true, bg: 'gradient' });
write('icon-foreground.png', 1024, { dir: assetsDir, bg: 'transparent', checkScale: 0.55 });
write('icon-background.png', 1024, { dir: assetsDir, bg: 'gradient', check: false });
write('splash.png', 2732, { dir: assetsDir, bg: 'dark', logo: 0.34, check: true, checkScale: 0.6 });
write('splash-dark.png', 2732, { dir: assetsDir, bg: 'dark', logo: 0.34, check: true, checkScale: 0.6 });
