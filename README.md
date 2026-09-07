# Mi Dashboard

Dashboard personal construido con **Next.js 16 (App Router)**, **NextAuth v5** (login con Google)
y **Tailwind CSS v4**. Responsive: pensado para usarse cómodo desde el celular y desde escritorio.

## Cómo funciona

1. `/login` – ingreso con cuenta de Google.
2. `/hub` – elegís entre **Personal** o **Trabajo**.
3. Cada sección tiene su propio menú lateral (drawer en mobile) con módulos:
   - **Personal**: Resumen · Estado contable · Tareas pendientes _(placeholders, se desarrollan de a poco)_
   - **Trabajo**: todavía sin módulos (a definir más adelante).

Toda ruta que no sea `/login` está protegida por `src/proxy.ts` (middleware de auth).

## Estructura

```
src/
  auth.ts                     Config de NextAuth (proveedor Google + allowlist opcional)
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

| Variable             | Descripción                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| `AUTH_SECRET`        | Secreto para firmar la sesión. Generalo con `npx auth secret`.            |
| `AUTH_GOOGLE_ID`     | Client ID de Google OAuth.                                                 |
| `AUTH_GOOGLE_SECRET` | Client Secret de Google OAuth.                                             |
| `ALLOWED_EMAILS`     | Opcional. Correos autorizados separados por coma. Vacío = cualquier cuenta. |

### 2. Credenciales de Google

1. [Google Cloud Console](https://console.cloud.google.com/) → creá o elegí un proyecto.
2. **APIs & Services → OAuth consent screen**: tipo "External", agregá tu correo como *test user*.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - (en producción) `https://TU-DOMINIO/api/auth/callback/google`
5. Copiá el *Client ID* y *Client Secret* a `.env.local`.

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
