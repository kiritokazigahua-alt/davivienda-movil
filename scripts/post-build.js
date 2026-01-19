import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

const cjsContent = `(async () => {
  await import('./index.js');
})();
`;

fs.writeFileSync(path.join(distPath, 'index.cjs'), cjsContent);
console.log('Created dist/index.cjs wrapper');
