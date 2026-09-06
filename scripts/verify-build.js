import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, [new URL('./generate-icons.js', import.meta.url).pathname], { stdio: 'inherit' });
const files = ['index.html','styles.css','app.js','songs.js','wake-lock.js','sw.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
await Promise.all(files.map(file => access(new URL(`../${file}`, import.meta.url))));
for (const file of ['app.js', 'songs.js', 'wake-lock.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', new URL(`../${file}`, import.meta.url).pathname], { stdio: 'inherit' });
}
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const ref of ['styles.css','app.js','manifest.webmanifest','icons/apple-touch-icon.png']) {
  if (!html.includes(ref)) throw new Error(`Missing page reference: ${ref}`);
}
console.log(`Static build verified: ${files.length} required files.`);
