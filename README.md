# Mi Dashboard

Dashboard personal construido con **Next.js 16 (App Router)**, **NextAuth v5**
y **Tailwind CSS v4**. Responsive: pensado para usarse cómodo desde el celular y desde escritorio.

> **Login actual:** contraseña única definida en `APP_PASSWORD`. El login con Google
> quedó preparado para reactivarse más adelante (ver más abajo).

## Cómo funciona

1. `/login` – ingreso con la contraseña de `APP_PASSWORD`.
2. `/hub` – elegís entre **Personal** o **Trabajo**.
3. Cada sección tiene su propio menú lateral (drawer en mobile) con módulos:
   - **Personal**: Resumen · Estado contable · Tareas pendientes _(placeholders, se desarrollan de a poco)_
   - **Trabajo**: todavía sin módulos (a definir más adelante).

Toda ruta que no sea `/login` está protegida por `src/proxy.ts` (middleware de auth).

## Estructura

```
src/
  auth.ts                     Config de NextAuth (login por contraseña; Google preparado)
  proxy.ts                    Protección de rutas
  lib/nav.ts                  Definición de secciones y sus módulos  <- acá agregás módulos nuevos
  lib/icons.ts                Mapa nombre -> icono (lucide-react)
  components/
    dashboard-shell.tsx       Layout responsive (sidebar + topbar + drawer mobile)
    page-parts.tsx            PageHeader, Card, ComingSoon
  app/
    login/                    Pantalla de ingreso
    hub/                      Selector Personal / Trabajo
    personal/                 layout + página de cada módulo
    trabajo/                  layout + placeholder
    api/auth/[...nextauth]/   Handlers de NextAuth
```

## Configuración

### 1. Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable          | Descripción                                                     |
| ----------------- | -------------------------------------------------------------- |
| `AUTH_SECRET`     | Secreto para firmar la sesión. Generalo con `npx auth secret`. |
| `APP_PASSWORD`    | Contraseña única de acceso al dashboard.                       |
| `APP_USER_NAME`   | Nombre que se muestra en la barra superior.                    |
| `APP_USER_EMAIL`  | Email que se muestra en la barra superior.                     |

### 2. (Más adelante) Reactivar login con Google

1. En `src/auth.ts`, agregá de nuevo el proveedor `Google` al array `providers`
   (podés dejar también el de contraseña o quitarlo).
2. En `src/app/login/login-button.tsx`, volvé a poner el botón "Continuar con Google"
   (`signIn("google", { callbackUrl })`).
3. [Google Cloud Console](https://console.cloud.google.com/): OAuth consent screen (External,
   tu correo como *test user*) → Credentials → OAuth client ID → Web application.
4. Redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Cargá `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` en `.env.local`.

## Desarrollo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Agregar un módulo nuevo a "Personal"

1. Creá la carpeta `src/app/personal/<mi-modulo>/page.tsx`.
2. Si usa un icono nuevo, agregalo a `src/lib/icons.ts`.
3. Sumá la entrada al array `nav` de `personal` en `src/lib/nav.ts`.

Listo: aparece en el menú lateral automáticamente.
