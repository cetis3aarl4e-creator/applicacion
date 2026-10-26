# Hábitos — Rastreador de hábitos + Agenda (PWA)

Aplicación web progresiva (PWA) para **uso personal**: rastreador visual de hábitos con
calendario mensual, rachas, estadísticas, heatmap de progreso y una agenda de tareas.
Funciona **sin conexión** y guarda los datos **en tu dispositivo** (IndexedDB). Puedes
activar **Supabase** como respaldo y sincronización entre dispositivos.

## Características

- **Panel de hoy**: marca tus hábitos del día y ve tus tareas.
- **Hábitos**: crear, editar, archivar, icono y color por hábito.
- **Calendario mensual**: navega entre meses y marca/desmarca días.
- **Rachas**: racha actual y mejor racha por hábito.
- **Estadísticas**: cumplimiento por hábito/mes + *heatmap* estilo GitHub.
- **Agenda**: tareas con fecha, notas y estado; las tareas de hoy aparecen en el panel.
- **Datos locales** (IndexedDB) con **exportar/importar JSON** y **exportar CSV** para Excel.
- **PWA**: instalable en el móvil, funciona offline, tema oscuro/claro.
- **PIN de acceso** opcional y **sincronización opcional con Supabase**.

## Uso local

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # prueba la build de producción
```

Los iconos ya están generados; si los modificas, `npm run icons` los regenera.

## App Android (APK) con Capacitor

La misma app se empaqueta como **app nativa de Android** usando Capacitor (el código web
corre dentro de un WebView; tus datos de IndexedDB se guardan en la app).

**Obtener el APK sin instalar Android Studio (recomendado):**

1. Sube el proyecto a GitHub. El workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)
   compila el APK en cada `git push` a `main` (o desde la pestaña **Actions → Run workflow**).
2. En GitHub: **Actions → Build Android APK → el run más reciente → Artifacts → `habitos-android`**.
   Descarga y descomprime → obtienes `app-debug.apk`.
3. Pásalo al móvil y ábrelo (permite "instalar de orígenes desconocidos"). ¡Listo!

> Es un APK de **debug**: se instala directamente (sideload) pero, al estar firmado con una
> clave temporal, para actualizar tendrás que desinstalar la versión anterior. Para una firma
> permanente (Play Store o actualizaciones en sitio) se necesita un keystore de release.

**Compilar localmente (opcional, requiere JDK 17 + Android Studio/SDK):**

```bash
npm run cap:sync   # build:native + copia a android/
npm run cap:open   # abre el proyecto en Android Studio
npm run apk        # compila el APK de debug con gradlew
```

Los iconos y splash nativos se generan con `npm run cap:assets` (fuentes en `assets/`).

## Desplegar en GitHub Pages

La app ya está preparada para subrutas (`base: './'`), así que funciona bajo
`https://TU_USUARIO.github.io/TU_REPO/`.

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta.
   - **GitHub Pages gratis requiere que el repo sea público.** No hay problema: tus datos
     viven en tu navegador y en Supabase, y la *anon key* no está en el código.
2. En el repo: **Settings → Pages → Source = "GitHub Actions"**.
3. Empuja a la rama `main`. El workflow de [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   compila y publica automáticamente en cada `git push`.
4. Tu app estará en `https://TU_USUARIO.github.io/TU_REPO/`. Ábrela en el móvil y usa
   **"Añadir a pantalla de inicio"** para instalarla como app.

> Si tu rama principal no se llama `main`, cambia `branches: [main]` en el workflow.

### Alternativa: Vercel

Si más adelante prefieres un repo privado con hosting, usa Vercel (gratis con repo privado):

1. Importa el repo en [vercel.com](https://vercel.com): *Add New → Project*.
2. Vercel detecta Vite automáticamente (ya hay un `vercel.json`). Pulsa **Deploy**.

> Sea cual sea el hosting, la URL será pública: activa un **PIN** en Ajustes para que solo
> tú puedas abrirla.

## Sincronizar con Supabase (opcional)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Copia la **Project URL** y la **anon public key** (Settings → API).
4. En la app: **Ajustes → Sincronización con Supabase**, pega ambas claves, **Probar conexión**
   y **Guardar**.
5. Pulsa **Sincronizar ahora** (también se sincroniza automáticamente tras cada cambio).

**Privacidad:** con las políticas del esquema, la base de datos es accesible con tu anon key
(que viaja en el navegador). Para un solo usuario es suficiente si mantienes la URL en
privado; si quieres privacidad fuerte, añade Supabase Auth (login) y ajusta las políticas
para usar `auth.uid()`.

## Estructura

```
src/
  App.tsx               navegación, PIN y tema
  db.ts                 base de datos local (Dexie/IndexedDB)
  actions.ts            operaciones CRUD + semilla de ejemplo
  stats.ts              rachas y estadísticas
  sync.ts               sincronización opcional con Supabase
  io.ts                 exportar/importar JSON y CSV
  date.ts               utilidades de fechas
  settings.ts           ajustes en localStorage
  components/           vistas y componentes de UI
supabase/schema.sql     tablas y políticas de Supabase
```
