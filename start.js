import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

const cjsContent = `(async () => {
  await import('./index.js');
})();
`;

fs.writeFileSync(path.join(distPath, 'index.cjs'), cjsContent);
console.log('Created dist/index.cjs wrapper');

await import('./dist/index.js');
