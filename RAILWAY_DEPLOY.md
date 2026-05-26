# Guia de Despliegue en Railway

## Paso 1: Crear cuenta en Railway
1. Ve a https://railway.app
2. Registrate con GitHub (gratis)

## Paso 2: Crear proyecto nuevo
1. En Railway, clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Elige tu repositorio: `urraca111111-sketch/davivienda`
4. Railway detectara automaticamente el `package.json`

## Paso 3: Agregar base de datos PostgreSQL
1. En tu proyecto Railway, clic en "New"
2. Selecciona "Database" -> "Add PostgreSQL"
3. Railway crea la base de datos automaticamente
4. La variable `DATABASE_URL` se crea automaticamente en las variables de entorno

## Paso 4: Configurar variables de entorno
Ve a "Variables" en tu servicio y agrega/verifica estas:

| Variable | Valor | Estado |
|----------|-------|--------|
| `DATABASE_URL` | Se crea automaticamente al agregar PostgreSQL | Creada por Railway |
| `NODE_ENV` | `production` | Agregar manualmente |
| `SESSION_SECRET` | Cualquier texto largo aleatorio (min 32 caracteres) | Agregar manualmente |
| `PORT` | Railway lo configura automaticamente | Opcional |

### Como generar SESSION_SECRET:
Abre la terminal de tu computadora y ejecuta:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copia el resultado y pegalo en `SESSION_SECRET`.

## Paso 5: Desplegar
1. Railway despliega automaticamente al hacer push a main
2. O clic en "Deploy" para desplegar manualmente
3. Espera a que termine el build (toma ~2-3 minutos)

## Paso 6: Configurar dominio publico
1. Ve a "Settings" -> "Networking"
2. Habilita "Generate Domain"
3. Railway te da una URL tipo: `https://tu-proyecto.railway.app`
4. Copia esta URL

## Paso 7: Ejecutar migraciones de base de datos
1. Ve a la pestana "Deployments"
2. Clic en los tres puntos de tu deployment activo
3. Selecciona "Shell"
4. En la terminal que se abre, ejecuta:
```bash
npx drizzle-kit push
```
Esto crea todas las tablas necesarias en PostgreSQL.

## Paso 8: Verificar que funciona
1. Abre la URL publica de Railway en tu navegador
2. Debe aparecer la pantalla de login de Davivienda
3. Prueba iniciar sesion con el usuario admin:
   - Documento: `admin`
   - Clave: `admin2025`

## Paso 9: (Opcional) Configurar Stripe
Si quieres que funcionen los pagos:
1. Crea cuenta en Stripe
2. Agrega variables:
   - `STRIPE_SECRET_KEY` = tu clave secreta de Stripe
   - `STRIPE_PUBLISHABLE_KEY` = tu clave publica de Stripe
3. Ve a Webhooks en Stripe y configura:
   - URL: `https://TU-DOMINIO.railway.app/api/stripe/webhook`

## Solucion de problemas

### Error: "Could not find the build directory"
Asegurate de que el build se ejecute correctamente. El script `npm run build` en package.json ya esta configurado.

### Error: "DATABASE_URL must be set"
Railway no ha creado la variable automaticamente. Ve a tu servicio PostgreSQL -> "Connect" -> copia la connection string y agregala como variable `DATABASE_URL`.

### La app no carga despues de desplegar
1. Revisa los logs en Railway (pestaña "Deployments" -> clic en el deployment -> "View Logs")
2. Verifica que las variables de entorno esten correctas
3. Asegurate de haber ejecutado `npx drizzle-kit push` para crear las tablas

## Estado del proyecto - Listo para Railway
- [x] Backend Express configurado para produccion
- [x] Puerto dinamico (PORT env)
- [x] Static files serving configurado
- [x] Build script configurado (vite + esbuild)
- [x] PostgreSQL con Neon/Drizzle
- [x] Railway.toml configurado
- [x] Origin validation adaptado para proxies
- [x] Stripe webhook adaptado para Railway domains
