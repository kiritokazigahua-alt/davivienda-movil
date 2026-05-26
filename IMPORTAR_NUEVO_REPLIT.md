# Como Importar este Proyecto a un Nuevo Replit

## ESTADO ACTUAL: Todo funciona correctamente
- Build: OK (18 segundos, sin errores)
- Workflow: Corriendo en puerto 5000
- Base de datos: Sincronizada (drizzle-kit push OK)
- PWA: manifest.json, service worker, iconos presentes
- Screenshots: Cargando correctamente (boton "Instalar Banca Movil" visible)

---

## PASO 1: Crear repositorio nuevo en GitHub

### Desde tu cuenta actual de GitHub (urraca111111-sketch):

1. Ve a https://github.com/urraca111111-sketch/davivienda
2. Click en **"Fork"** (arriba a la derecha)
3. Selecciona tu cuenta **urraca111111-sketch**
4. Te creará un fork nuevo con todos los commits

**O bien, si quieres un repo limpio sin historial:**

En la terminal de Replit, ejecuta estos comandos:

```bash
# 1. Empaquetar TODO el proyecto (incluyendo lo que git ignora)
cd /home/runner/workspace

# 2. Crear un zip con los archivos esenciales
zip -r davivienda-export.zip \
  package.json package-lock.json \
  .replit .gitignore components.json \
  postcss.config.js tailwind.config.ts drizzle.config.ts \
  railway.toml RAILWAY_DEPLOY.md NUEVO_REPLIT_SETUP.md \
  server/ shared/ client/ \
  -x "*.tar.gz" -x "server/public/*" 2>/dev/null

# 3. Verificar que el zip se creo
ls -lh davivienda-export.zip
```

---

## PASO 2: Crear NUEVO repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name**: `davivienda` (o el nombre que quieras)
3. **Visibility**: Public (o Private)
4. **NO** marques "Add a README"
5. Click **"Create repository"**
6. En la pagina que aparece, copia esta seccion (HTTPS):

```bash
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/urraca111111-sketch/davivienda.git
```

---

## PASO 3: Subir TODO a GitHub (desde la terminal de Replit)

**IMPORTANTE**: Esto empuja el codigo COMPLETO que funciona ahora mismo.

```bash
cd /home/runner/workspace

# 1. Agregar el nuevo repositorio como remote
git remote add nuevo https://github.com/urraca111111-sketch/davivienda.git

# 2. Hacer push de TODO a la nueva cuenta
git push nuevo main

# Si pide usuario/contraseña:
# Usuario: urraca111111-sketch
# Contraseña: Tu Personal Access Token de GitHub (no tu contraseña normal)
# Si no tienes token, crea uno aqui: https://github.com/settings/tokens
```

---

## PASO 4: Importar en NUEVO Replit

1. En el nuevo Replit, click **"Create"**
2. Selecciona **"Import from GitHub"**
3. Pega la URL: `https://github.com/urraca111111-sketch/davivienda.git`
4. Click **"Import from GitHub"**
5. Espera a que cargue

---

## PASO 5: Configurar PostgreSQL en el nuevo Replit

1. En el nuevo Replit, abre el panel **"Tools"** -> **"Database"**
2. Activa la base de datos PostgreSQL
3. Copia la **Connection String** (se ve asi: `postgresql://usuario:pass@host:puerto/db`)

---

## PASO 6: Crear variable de entorno DATABASE_URL

1. En el nuevo Replit, abre el panel **"Secrets"** (icono de candado)
2. Click **"+ New Secret"**
3. **Key**: `DATABASE_URL`
4. **Value**: Pega la connection string del Paso 5
5. Click **"Add Secret"**
6. Crea otra secret:
   - **Key**: `SESSION_SECRET`
   - **Value**: Cualquier texto largo, ej: `mi-secreto-super-seguro-2026-x7z9q2w8`

---

## PASO 7: Instalar dependencias

En la terminal del nuevo Replit:
```bash
npm install
```

---

## PASO 8: Sincronizar base de datos

En la terminal:
```bash
npx drizzle-kit push
```

Esto crea todas las tablas en PostgreSQL.

---

## PASO 9: Ejecutar la aplicacion

Click en el boton **"Run"** (verde, arriba).

O en terminal:
```bash
npm run dev
```

---

## PASO 10: Verificar que funciona

1. El preview deberia mostrar la pantalla roja de Davivienda
2. Click **"Soy cliente"**
3. Documento: `admin`, Clave: `admin2025` -> Login OK
4. Click **"Quiero un producto"** -> Registro pide Direccion
5. El boton **"Instalar Banca Movil"** aparece en welcome

---

## SI ALGO FALLA EN EL NUEVO REPLIT

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "DATABASE_URL must be set"
Revisa el panel Secrets. DATABASE_URL debe existir.

### Error: "relation does not exist"
```bash
npx drizzle-kit push
```

### La pantalla esta en blanco
Revisa que el workflow "Start application" este configurado:
- Comando: `npm run dev`
- Puerto: 5000

---

## ARCHIVOS CLAVE QUE DEBEN EXISTIR

Si alguno falta, el proyecto no funcionara:
```
package.json
.replit
server/index.ts
server/routes.ts
server/storage.ts
server/db.ts
shared/schema.ts
client/src/App.tsx
client/src/pages/login.tsx
client/public/manifest.json
client/public/sw.js
drizzle.config.ts
```

---

## DATOS IMPORTANTES

- **Workflow**: `npm run dev` (puerto 5000)
- **Build**: `npm run build`
- **Base de datos**: PostgreSQL (via Replit Database)
- **Framework**: React + Express + Drizzle ORM
- **Admin login**: `admin` / `admin2025`
- **God Panel password**: `1083839142`

---

## CREDENCIALES DE PRUEBA

| Usuario       | Documento      | Clave      |
|---------------|----------------|------------|
| Admin         | admin          | admin2025  |
| God Panel     | -              | 1083839142 |
| Demo          | mreynaaviles   | 2316       |
