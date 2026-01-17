import { writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');

// Build production server separately to avoid vite imports
console.log('Building production server...');
execSync('npx esbuild server/prod-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', {
  cwd: join(__dirname, '..'),
  stdio: 'inherit'
});

const cjsWrapper = `(async () => {
  await import('./index.js');
})();
`;

writeFileSync(join(distPath, 'index.cjs'), cjsWrapper);
console.log('Created dist/index.cjs wrapper');
