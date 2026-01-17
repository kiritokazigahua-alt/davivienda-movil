#!/bin/bash
set -e

echo "Building frontend with Vite..."
npx vite build

echo "Building production server..."
npx esbuild server/prod-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Creating CJS wrapper..."
cat > dist/index.cjs << 'EOF'
(async () => {
  await import('./index.js');
})();
EOF

echo "Build completed successfully!"
ls -la dist/
