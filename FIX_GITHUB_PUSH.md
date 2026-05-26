# Fix: GitHub Rechaza el Push por Archivo APK Grande

## Problema
El archivo `attached_assets/basebazo_1772091842422.apk` (96MB) esta en el historial de git de commits anteriores.
GitHub bloquea archivos mayores a 50MB, por eso el push falla con "permission denied".

## Solucion paso a paso (ejecutar en terminal de Replit)

### Paso 1: Eliminar el archivo grande del historial de git
```bash
cd /home/runner/workspace

# Eliminar el APK del historial completo de git
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch attached_assets/basebazo_1772091842422.apk' \
  --prune-empty --tag-name-filter cat -- --all
```

Esto puede tardar 1-2 minutos.

### Paso 2: Limpiar referencias y liberar espacio
```bash
# Eliminar referencias antiguas
rm -rf .git/refs/original/

# Ejecutar garbage collect para limpiar objetos antiguos
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Paso 3: Forzar el push al nuevo repositorio
```bash
git push nuevo main --force
```

Esto empuja el codigo LIMPIO sin el APK grande.

---

## Si `git filter-branch` no funciona (metodo alternativo)

Si el paso 1 da error, usa este metodo con `git-filter-repo`:

```bash
# Instalar git-filter-repo (si no esta disponible)
pip install git-filter-repo

# Usar git-filter-repo para eliminar el archivo
git filter-repo --strip-blobs-bigger-than 50M --force

# Luego hacer push
git push nuevo main --force
```

---

## Si NADA funciona: metodo nuclear (mas seguro)

Crea un nuevo repositorio en GitHub TOTALMENTE VACIO:

1. Ve a https://github.com/new
2. Nombre: `davivienda-movil` (nombre diferente)
3. **NO marques** "Add a README"
4. **NO marques** "Add .gitignore"
5. **NO marques** "Choose a license"
6. Click **"Create repository"**
7. Copia la URL HTTPS que te da

En terminal de Replit:
```bash
cd /home/runner/workspace

# Eliminar remote anterior
git remote remove nuevo 2>/dev/null

# Agregar el nuevo remote
git remote add nuevo https://github.com/urraca111111-sketch/davivienda-movil.git

# Forzar push (repo vacio, no habra conflictos)
git push nuevo main --force
```

---

## Verificacion despues del push

Ve a https://github.com/urraca111111-sketch/davivienda

Deberias ver:
- Todos los archivos del proyecto
- Sin archivo APK grande
- Commit mas reciente: "Add address field to user registration..."

---

## Luego: Importar en nuevo Replit

1. En nuevo Replit -> "Import from GitHub"
2. URL: `https://github.com/urraca111111-sketch/davivienda.git`
3. Secrets -> DATABASE_URL (de PostgreSQL de Replit)
4. Secrets -> SESSION_SECRET
5. Terminal: `npm install`
6. Terminal: `npx drizzle-kit push`
7. Click Run
