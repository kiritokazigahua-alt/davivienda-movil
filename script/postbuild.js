import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');

const cjsWrapper = `(async () => {
  await import('./index.js');
})();
`;

writeFileSync(join(distPath, 'index.cjs'), cjsWrapper);
console.log('Created dist/index.cjs wrapper');
