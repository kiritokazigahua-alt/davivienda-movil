# Instrucciones Precisas para Recrear el Proyecto en Nuevo Replit

## PROBLEMA
Al exportar a GitHub e importar en otro Replit se pierde:
- Archivos ignorados por git (node_modules, dist)
- Variables de entorno (DATABASE_URL, SESSION_SECRET)
- Configuracion de la base de datos PostgreSQL

## SOLUCION - Pasos Exactos

---

### **PASO 1: Crear nuevo Replit desde GitHub**
1. En Replit, click **"Create"** o **"+"**
2. Selecciona **"Import from GitHub"**
3. Pega la URL de tu repo: `https://github.com/urraca111111-sketch/davivienda`
4. Click **"Import from GitHub"**
5. Espera a que cargue

---

### **PASO 2: Configurar base de datos PostgreSQL**
1. En el panel lateral izquierdo del nuevo Replit, busca **"Tools"**
2. Click en **"Database"** (icono de base de datos)
3. Se abre el panel de PostgreSQL
4. Click en **"New Database"** o busca el que ya esta
5. Copia la **connection string** que te muestra Replit (se ve asi: `postgresql://postgres:password@db.xxx.replit.dev:5432/postgres`)

---

### **PASO 3: Crear variable de entorno DATABASE_URL**
1. En el panel lateral izquierdo, click en **"Secrets"** (icono de candado)
2. Click en **"+ New Secret"**
3. **Key**: `DATABASE_URL`
4. **Value**: Pega la connection string que copiaste del Paso 2
5. Click **"Add Secret"**
6. Crea otra secret:
   - **Key**: `SESSION_SECRET`
   - **Value**: Cualquier texto largo aleatorio (minimo 32 caracteres). Ejemplo: `tu-super-secreto-ultra-seguro-2026-davivienda-x7z9`

---

### **PASO 4: Instalar dependencias**
Abre la **Shell** (terminal) en el nuevo Replit y ejecuta:
```bash
npm install
```
Espera que termine (~1-2 minutos).

---

### **PASO 5: Sincronizar la base de datos con el schema**
En la misma terminal, ejecuta:
```bash
npx drizzle-kit push
```
Esto crea todas las tablas necesarias en PostgreSQL.

---

### **PASO 6: Verificar que el workflow esta configurado**
1. En el panel lateral izquierdo, click en **"Deployments & Workflows"** (icono de nube)
2. Asegurate de que hay un workflow llamado **"Start application"**
3. Si NO existe, crealo:
   - Click **"+ Add Workflow"**
   - Name: `Start application`
   - Command: `npm run dev`
   - Click **Save**

---

### **PASO 7: Iniciar la aplicacion**
1. Click en el boton **"Run"** (verde, arriba)
2. Espera que compile (~20 segundos)
3. La app deberia cargar en el panel derecho (preview)

---

### **PASO 8: Verificar que funciona**
Abre el preview y prueba:
1. La pantalla de login de Davivienda debe aparecer
2. Click en **"Soy cliente"**
3. Documento: `admin`, Clave: `admin2025` -> Debe iniciar sesion
4. Click en **"Quiero un producto"** -> El registro debe pedir Direccion

---

### **PASO 9: (Opcional) Verificar PWA**
- En la pantalla de bienvenida debe aparecer el boton **"Instalar Banca Movil"**

---

## ARCHIVOS IMPORTANTES QUE DEBEN EXISTIR

Verifica que estos archivos esten en el nuevo Replit:

```
package.json                  <-- Debe estar
server/index.ts               <-- Debe estar
server/routes.ts              <-- Debe estar
server/storage.ts             <-- Debe estar
server/db.ts                  <-- Debe estar
shared/schema.ts              <-- Debe estar
client/src/App.tsx            <-- Debe estar
client/src/pages/login.tsx    <-- Debe estar
client/src/pages/home.tsx     <-- Debe estar
client/src/pages/admin.tsx    <-- Debe estar
client/public/manifest.json   <-- Debe estar
client/public/sw.js           <-- Debe estar
drizzle.config.ts             <-- Debe estar
```

---

## SI ALGO FALLA - Comandos de diagnostico

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "DATABASE_URL must be set"
```bash
# Verificar que la secret existe
# Ir a Secrets panel y confirmar que DATABASE_URL esta ahi
# Si no esta, crearla con la connection string de PostgreSQL
```

### Error: "relation does not exist" (tablas no creadas)
```bash
npx drizzle-kit push
```

### Error: "Port 5000 already in use"
```bash
# El workflow ya deberia manejar esto automaticamente
# Si no, deten el workflow y reinicia:
# Click en el cuadrado rojo (Stop) y luego en Run (verde)
```

---

## CREDENCIALES DE PRUEBA

| Usuario | Documento | Clave |
|---------|-----------|-------|
| Admin   | admin     | admin2025 |
| God Panel | -       | 1083839142 (boton oculto en admin) |
| Demo    | mreynaaviles | 2316 |

---

## DIFERENCIA ENTRE RAILWAY Y REPLIT

- **Replit**: Desarrollo rapido, base de datos PostgreSQL integrada, preview automatico
- **Railway**: Produccion real, base de datos PostgreSQL separada, dominio publico propio

Usa Replit para desarrollar y probar, y Railway para la version publica que usan tus clientes.
