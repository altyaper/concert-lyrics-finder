import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0); name.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}
function icon(size, path, maskable = false) {
  const rows=[];
  for (let y=0; y<size; y++) {
    const row=Buffer.alloc(1 + size*4); row[0]=0;
    for (let x=0; x<size; x++) {
      const dx=x-size/2, dy=y-size/2;
      const radius=Math.hypot(dx,dy);
      const gold=radius < size*(maskable?.36:.43);
      const noteStem=x>size*.51 && x<size*.59 && y>size*.27 && y<size*.65;
      const noteBar=x>size*.37 && x<size*.58 && y>size*.27 && y<size*.35;
      const noteHead=((x-size*.43)**2+(y-size*.67)**2)<(size*.115)**2;
      const dark=gold && (noteStem||noteBar||noteHead);
      const i=1+x*4;
      const c=dark?[18,14,9]:gold?[244,191,79]:[9,9,9];
      row[i]=c[0];row[i+1]=c[1];row[i+2]=c[2];row[i+3]=255;
    }
    rows.push(row);
  }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.concat(rows),{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync(path,png);
}
mkdirSync(new URL('../icons/',import.meta.url),{recursive:true});
icon(180,new URL('../icons/apple-touch-icon.png',import.meta.url));
icon(192,new URL('../icons/icon-192.png',import.meta.url));
icon(512,new URL('../icons/icon-512.png',import.meta.url));
icon(512,new URL('../icons/icon-maskable-512.png',import.meta.url),true);
