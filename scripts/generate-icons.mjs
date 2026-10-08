// Regenera los íconos del sitio a partir de la ÚNICA fuente: app/icon.svg.
//
//   node scripts/generate-icons.mjs
//
// Escribe app/favicon.ico (16/32/48, PNGs dentro de un contenedor ICO) y
// app/apple-icon.png (180 px, fondo blanco: iOS no respeta la transparencia).
// Next los sirve solo por el nombre del archivo. Correrlo cada vez que cambie
// app/icon.svg — y si cambia el DIBUJO, también components/AgentMark.tsx (MarkB).
//
// `sharp` llega como dependencia de Next; no hace falta instalar nada.

import sharp from "sharp";
import fs from "node:fs";

const SOURCE = "app/icon.svg";
const svg = fs.readFileSync(SOURCE);
const render = (size) => sharp(svg, { density: 1200 }).resize(size, size).png().toBuffer();

// favicon.ico
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo: ícono
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // planos de color
  entry.writeUInt16LE(32, 6); // bits por pixel
  entry.writeUInt32LE(images[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return entry;
});
fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...entries, ...images]));

// apple-icon.png
const inner = await sharp(svg, { density: 1200 }).resize(132, 132).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("app/apple-icon.png");

console.log(`favicon.ico y apple-icon.png regenerados desde ${SOURCE}`);
