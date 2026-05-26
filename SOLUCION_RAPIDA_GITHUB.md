# Solucion Rapida: Subir a GitHub sin Archivo APK Grande

## EL PROBLEMA
El archivo APK de 96MB esta en el historial de git de commits viejos.
GitHub bloquea archivos mayores a 50MB. Aunque el archivo ya no este en la carpeta actual,
git lo tiene guardado en el historial.

## LA SOLUCION MAS SENCILLA (3 comandos)

Ejecuta ESTOS 3 COMANDOS en la terminal de Replit, uno por uno:

### Comando 1: Eliminar el archivo grande del historial de git
```bash
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch attached_assets/basebazo_1772091842422.apk' --prune-empty --tag-name-filter cat -- --all
```
Espera a que termine (1-2 minutos). Veras muchas lineas con numeros, eso es normal.

### Comando 2: Limpiar el repositorio local
```bash
rm -rf .git/refs/original/ && git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

### Comando 3: Empujar a GitHub
```bash
git push nuevo main --force
```

---

## SI EL COMANDO 1 FALLA - Metodo alternativo mas facil

Si el paso 1 da error, haz esto:

### Paso A: Crear un ZIP con el codigo (sin git)
```bash
cd /home/runner/workspace

# Crear una copia limpia del proyecto (sin .git, sin node_modules)
mkdir /tmp/davivienda-limpio

# Copiar archivos esenciales
cp -r server shared client drizzle.config.ts package.json package-lock.json .gitignore .relit components.json postcss.config.js tailwind.config.ts vite.config.ts railway.toml RAILWAY_DEPLOY.md NUEVO_REPLIT_SETUP.md IMPORTAR_NUEVO_REPLIT.md SOLUCION_RAPIDA_GITHUB.md replit.md /tmp/davivienda-limpio/

# Crear el ZIP
cd /tmp
cp -r davivienda-limpio davivienda
zip -r davivienda.zip davivienda
```

### Paso B: Descargar el ZIP y subirlo a GitHub manualmente
1. En el panel de archivos de Replit (izquierda), ve a `/tmp/`
2. Click derecho en `davivienda.zip` -> "Download"
3. En tu computadora, descomprime el ZIP
4. Ve a https://github.com/urraca111111-sketch/davivienda
5. Click en "Upload files" (arriba a la derecha, boton verde "<> Code" -> "Upload files")
6. Arrastra TODOS los archivos de la carpeta descomprimida
7. Escribe un mensaje de commit: "feat: subida inicial del proyecto"
8. Click "Commit changes"

---

## SI TAMPOCO FUNCIONA - Crear repo nuevo con nombre diferente

1. Ve a https://github.com/new
2. **Repository name**: `davivienda-movil` (nombre NUEVO, diferente)
3. **NO marques**: "Add a README", "Add .gitignore", "Choose a license"
4. Click **"Create repository"**
5. Copia la URL HTTPS que aparece
6. En Replit terminal:

```bash
cd /home/runner/workspace
git remote remove nuevo 2>/dev/null
git remote add nuevo https://github.com/urraca111111-sketch/davivienda-movil.git
git push nuevo main --force
```

---

## VERIFICAR QUE FUNCIONO

Ve a la URL de tu repo en GitHub. Deberias ver los archivos del proyecto:
- `server/`
- `client/`
- `shared/`
- `package.json`
- `railway.toml`
- etc.

NO deberias ver ningun archivo APK.

---

## DESPUES: Importar en Replit

1. Nuevo Replit -> "Import from GitHub"
2. URL: `https://github.com/urraca111111-sketch/davivienda.git`
3. Secrets -> DATABASE_URL (PostgreSQL de Replit)
4. Secrets -> SESSION_SECRET
5. Terminal: `npm install`
6. Terminal: `npx drizzle-kit push`
7. Click Run
