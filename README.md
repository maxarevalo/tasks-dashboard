# Mi Dashboard

Dashboard personal construido con **Next.js 16 (App Router)**, **NextAuth v5**,
**MongoDB (Mongoose)** y **Tailwind CSS v4**. Responsive: pensado para usarse
cómodo desde el celular y desde escritorio.

> **Login actual:** contraseña única definida en `APP_PASSWORD`. El login con Google
> quedó preparado para reactivarse más adelante (ver más abajo).

## Cómo funciona

1. `/login` – ingreso con la contraseña de `APP_PASSWORD`.
2. `/hub` – elegís entre **Personal** o **Trabajo**.
3. Cada sección tiene su propio menú lateral (drawer en mobile) con módulos:
   - **Personal**: Resumen · Estado contable · Tareas pendientes _(placeholders, se desarrollan de a poco)_
   - **Trabajo**: todavía sin módulos (a definir más adelante).

Toda ruta que no sea `/login` está protegida por `src/proxy.ts` (middleware de auth).

### Módulo: Gastos mensuales (`/personal/gastos`)

- Vista por mes con navegación ‹ / › y "ir al mes actual".
- 4 categorías: **Tarjetas · Préstamos · Gastos fijos · Previstos**.
- **ARS y USD se llevan por separado** (nunca se convierte): todos los totales
  muestran dos líneas.
- **Cuotas**: al cargar una compra en cuotas elegís el mes de inicio, en qué
  número de cuota estás y el total; se generan las cuotas restantes, una por mes.
  Se pueden borrar de a una, "esta y las futuras", o todas.
- **Tarjetas** (`/personal/gastos/tarjetas`): alta con día de cierre y vencimiento.
- **Gastos fijos** (`/personal/gastos/fijos`): plantillas (desde/hasta, activo).
  Al crearlas, una opción (tildada por defecto) las carga automáticamente en el
  mes actual y en todos los siguientes. Si se destilda, quedan como plantilla y
  se cargan a mano con el botón "Cargar ahora" de cada mes (idempotente).
  - **Editar con vigencia**: desde el menú (…) de un gasto fijo en la vista
    mensual, "Editar el gasto fijo…" propaga el cambio (ej. aumento de monto)
    desde el mes elegido en adelante. Los meses anteriores, los pagados y los
    editados a mano no se tocan.
  - **Quitar de un mes puntual**: no se vuelve a generar en ese mes
    (`skipPeriods`). Se ve en el manager de fijos.
  - **Aviso de fin**: si un fijo no continúa el mes siguiente (fecha "hasta"
    alcanzada, pausado o plantilla borrada), la fila muestra un badge y el mes
    un banner.
- Marcar pagado / pendiente por gasto.

Código: modelos en `src/models/gastos.ts`, lecturas en
`src/features/gastos/queries.ts`, mutaciones (Server Actions) en
`src/features/gastos/actions.ts`.

**Pendiente (próximas etapas):** ingresos por origen, ahorros ARS/USD,
proyección de ahorro del mes siguiente, y gráficos.

## Estructura

```
src/
  auth.ts                     Config de NextAuth (login por contraseña; Google preparado)
  proxy.ts                    Protección de rutas
  lib/
    db.ts                     Conexión a MongoDB (cacheada)
    nav.ts                    Secciones y módulos  <- acá agregás módulos nuevos
    icons.ts                  Mapa nombre -> icono (lucide-react)
    period.ts / money.ts      Helpers de meses y moneda
  models/gastos.ts            Schemas Mongoose (Card, Expense, FixedExpense)
  features/gastos/            queries.ts (lectura), actions.ts (Server Actions), types.ts
  components/
    dashboard-shell.tsx       Layout responsive (sidebar + topbar + drawer mobile)
    ui.tsx / modal.tsx        Inputs, botones, modal
    page-parts.tsx            PageHeader, Card, ComingSoon
  app/
    login/                    Pantalla de ingreso
    hub/                      Selector Personal / Trabajo
    personal/                 layout + módulos (gastos/, estado-contable/, tareas/)
    trabajo/                  layout + placeholder
    api/auth/[...nextauth]/   Handlers de NextAuth
```

## Configuración

### 1. Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable          | Descripción                                                     |
| ----------------- | -------------------------------------------------------------- |
| `AUTH_SECRET`     | Secreto para firmar la sesión. Generalo con `npx auth secret`. |
| `MONGODB_URI`     | Conexión a MongoDB (Atlas o local), con el nombre de la base en la URI. |
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
4. Redirect URI: `http://localhost:2999/api/auth/callback/google`
   (para entrar por IP de red agregá también `http://192.168.1.225:2999/api/auth/callback/google`
   y seteá `AUTH_URL=http://192.168.1.225:2999` en `.env.local`).
5. Cargá `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` en `.env.local`.

## Desarrollo

```bash
npm install
npm run dev
```

Abrí http://localhost:2999

## Acceder desde el celular (misma red WiFi)

1. **IP correcta de la PC.** Tu IP de red local es la del adaptador Wi-Fi
   (algo tipo `192.168.1.225`), *no* las `172.x` que son adaptadores virtuales
   (Hyper-V/WSL) y el celular no puede alcanzar. Para verla:

   ```powershell
   (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
   ```

   Next también la imprime al arrancar (`- Network: http://192.168.1.225:2999`).

2. **`AUTH_TRUST_HOST=true`** en `.env.local` (ya está) — sin esto NextAuth
   rechaza el login cuando entrás por IP en vez de `localhost`.

3. **Firewall de Windows.** Hay que permitir el puerto 2999 para entrada.
   Una vez, en **PowerShell como administrador**:

   ```powershell
   New-NetFirewallRule -DisplayName "Next dev 2999" -Direction Inbound `
     -Action Allow -Protocol TCP -LocalPort 2999 -Profile Any
   ```

4. En el celular abrí `http://192.168.1.225:2999` (reemplazá por tu IP).

> Si cambiás de red, la IP cambia. El router suele darte siempre la misma por DHCP,
> pero conviene fijar una reserva de IP en el router si vas a usarlo seguido.

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
