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

### Perfiles de datos (`/personal/perfiles`)

Ambientes de datos separados sobre **la misma conexión de MongoDB** (ej.
"Principal" con datos reales, "Ficticio" para pruebas). Cada documento de gastos,
tarjetas, gastos fijos, ahorros e ingresos guarda `userId` = clave del perfil.

- Selector en la barra superior + página de gestión.
- Crear (arranca vacío), renombrar, **duplicar** (copia todos los datos con las
  referencias remapeadas) y borrar (borra el perfil y **todos** sus datos).
- El perfil activo se guarda en la cookie `profile`. Los datos previos a esta
  feature quedan en el perfil por defecto ("Principal", clave `owner`).

Código: `src/models/profile.ts`, `src/lib/profile.ts` (resuelve el perfil
activo), `src/features/profiles/actions.ts`.

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
  - **Frecuencia mensual, semestral o anual**: un fijo semestral se carga cada
    6 meses desde el mes de "Desde" (ej. seguro pagado dos veces al año) y uno
    anual una sola vez al año (ej. patente). Los no mensuales se proyectan 5
    años hacia adelante en vez de 2.
- **Etiqueta por gasto** (opcional, con ícono): Supermercado, Obra,
  Suscripciones, Combustible, Auto, Dardo, Farmacia, Salidas, Servicios,
  Otros. Se elige al cargar o editar cualquier gasto (suelto, en cuotas o
  fijo); en los fijos se propaga automáticamente a cada mes materializado.
  Sin etiqueta por defecto. Enum e íconos en `src/lib/tags.ts`.
- Marcar pagado / pendiente por gasto.
- **Detalle agrupado por tarjeta**: dentro de cada categoría, si hay gastos
  de más de una tarjeta (o sin tarjeta), se subagrupan por tarjeta con su
  propio subtotal por moneda. Si todo es de la misma tarjeta (o ninguna), se
  ve como lista simple, sin el subtotal redundante.
- **Presupuesto previsto por etiqueta** (botón "Presupuesto por etiqueta"):
  cargás un monto para una etiqueta en el mes (ej. Combustible: $200.000) y
  se va descontando solo con cada gasto que cargues con esa misma etiqueta,
  sin importar su categoría (tarjeta, fijo, etc.) — no hace falta que el
  gasto sea "previsto". Se muestra en la sección **Previstos** del Detalle,
  con gastado/disponible y una barra de progreso (roja si se excede). Un
  presupuesto por etiqueta+moneda por mes (se puede editar el monto; para
  cambiar la etiqueta hay que borrar y crear uno nuevo). Modelo `Budget` en
  `src/models/gastos.ts`.
  - **Replicar presupuesto**: desde el menú (…) de un presupuesto, "Replicar
    1/3/6/12 meses siguientes" lo copia (mismo monto) a esos meses que
    vienen, creando o actualizando el presupuesto de cada uno.
- **Replicar al mes siguiente**: desde el menú (…) de cualquier gasto (no
  cuotas), "Replicar al mes siguiente" copia ese gasto puntual al mes que
  viene (no duplica si ya hay uno con la misma descripción/tarjeta ahí). Si el
  gasto ya está replicado, la fila muestra el tag **"Replicado en próx. mes"**.
  El botón **"Replicar mes siguiente"** del encabezado abre un paso previo:
  una lista con checkbox de todo lo replicable ese mes, con **los gastos de
  categoría "fijo" tildados por defecto** (el resto sin tildar); "Todos" /
  "Ninguno" para ajustar rápido, y "Replicar N" copia solo lo elegido.
- **Tabla mensual** (`/personal/gastos/tabla`): matriz con un mes por columna
  (ventanas de 10 meses, navegables ‹/›), filas agrupadas por categoría,
  subtotales por categoría y total por mes. Los gastos fijos sin cargar
  aparecen como celdas estimadas (cursiva + `*`).
  - **ARS / USD / Unificado**: el modo "Unificado" combina ambas monedas con
    la cotización configurada en Estado contable → Vista unificada (misma
    `ExchangeRate` del perfil), y un sub-toggle "en ARS / en USD" para elegir
    en qué moneda ver el total. Un gasto con la misma descripción cargado
    alguna vez en ARS y otra en USD se suma ya convertido en la misma fila.
    Si no hay cotización configurada, muestra un aviso con link para cargarla.
- **Importar masivo** (botón "Importar"): se pega **un array JSON** (recomendado)
  o el texto crudo del resumen de tarjeta. Segundo paso: se edita cada ítem
  (mes, categoría, moneda, tarjeta, monto, pagado) o se aplica categoría/tarjeta
  a todos de una. Admite montos negativos (reintegros).
  Parser en `src/features/gastos/parse-bulk.ts`.

  En la revisión se marcan los duplicados contra la base (mismo mes):
  **rojo** = ya existe uno idéntico (misma descripción y monto) → queda
  destildado; **naranja** = misma descripción con otro monto → se importa pero
  avisa. Cada fila marcada tiene un check "Importar igualmente".

  Formato JSON — `desc` y `amount` obligatorios, el resto opcional:
  ```json
  [
    { "desc": "Pagos360 applus", "amount": 97057.65, "category": "tarjeta", "card": "Visa Galicia" },
    { "desc": "Los primos", "amount": 15300, "month": "2026-09" },
    { "desc": "Google Cloud", "amount": 1.99, "currency": "USD" },
    { "desc": "Reintegro Disney", "amount": -23999, "paid": true }
  ]
  ```
  `currency`: `ARS`|`USD` (def. ARS) · `category`: `tarjeta`|`prestamo`|`fijo`|`previsto` ·
  `card`: nombre exacto de la tarjeta · `month`: `YYYY-MM` (def. el mes visible) ·
  `paid`: bool. Alias aceptados: `description`/`descripcion`, `monto`/`importe`,
  `moneda`, `categoria`/`tipo`, `tarjeta`, `mes`/`fecha`/`date`, `pagado`.

Código: modelos en `src/models/gastos.ts`, lecturas en
`src/features/gastos/queries.ts`, mutaciones (Server Actions) en
`src/features/gastos/actions.ts`.

### Módulo: Estado contable (`/personal/estado-contable`)

Cruza con Gastos para proyectar el saldo. **La vista por defecto es "Vista
unificada"** (`/unificado`) — la ruta base redirige ahí. Desde ahí, las
tabs "Ahorros" / "Ingresos" / "Detalle por moneda" llevan al resto.

- **Ahorros** (`/ahorros`): cuentas por **categoría** y **disponibilidad**
  (inmediata / corto plazo / inmovilizada), en ARS o USD, con saldo actual y
  **rendimiento** configurable por cuenta: TNA o TEA (capitalizan mes a mes),
  tasa mensual directa (sin capitalizar), o **saldos cargados a mano** por mes.
  Una cuenta por moneda se marca "acá cae el excedente del mes".
  - **Ahorros REALES**: junto a "Ahorros totales" se muestra este segundo
    monto = ahorros totales **menos** la suma de los montos al vencimiento
    de los plazos fijos **activos** de PF Dardo, para no contar dos veces la
    plata que ya está puesta en un plazo fijo.
- **Ingresos** (`/ingresos`): por **origen**, únicos o recurrentes con
  **frecuencia mensual, semestral o anual**, "confirmados" o "posibles".
  Un ingreso semestral (ej. **aguinaldo/SAC**) se carga una vez, con inicio en
  el primer mes de cobro (ej. junio): se computa automáticamente también 6
  meses después (diciembre) y así sucesivamente, sin duplicar la carga.
- **Proyección**: horizonte **3**/6/12/24 meses (3 por defecto), por moneda.
  Cada mes muestra ingresos, gastos (materializados + fijos que van a caer),
  neto, rendimiento y **saldo acumulado**. Gráfico de línea + tabla, marca
  cuándo el saldo se vuelve negativo.
  - **Línea "Ahorro real"**: paralela a la de "Saldo" (línea punteada), es el
    saldo proyectado menos el total de plazos fijos de PF Dardo de hoy — el
    mismo ajuste que "Ahorros REALES", constante a lo largo de todo el
    horizonte (no es una proyección independiente de los plazos fijos).
- **Disponible en el mes** = ahorros totales + ingresos − gastos del mes.
- **Vista unificada** (`/personal/estado-contable/unificado`, **vista por
  defecto** de este módulo): todo convertido a **una sola moneda** (elegís
  ARS o USD). Cotización USD/ARS configurable — **a mano** (compra + venta)
  o **desde API** (dolarapi.com: oficial, blue, MEP, cripto, tarjeta,
  mayorista) con botón "Actualizar" y auto-refresco si está vieja (>6 h). El
  valor usado para convertir se elige entre compra, venta o promedio. Helper
  en `src/lib/exchange.ts`.
- **Detalle por moneda** (`/personal/estado-contable/detalle`): la vista
  "clásica" con los mismos números pero separados por ARS/USD sin convertir
  (antes vivía en la ruta base).

Código: `src/models/contable.ts`, `src/features/contable/` (queries, actions,
`projection.ts` con la matemática pura), `src/lib/rates.ts`.

### Módulo: PF Dardo (`/personal/pf-dardo`)

Tabla de plazos fijos con renovación y monto real prorrateado por movimientos.

- **Plazos fijos**: por cada uno se carga descripción (opcional), moneda,
  **fecha desde**, **plazo (en días)** y **TNA** (tasa nominal anual, %). Se
  calculan automáticamente: **fecha hasta** (desde + plazo), **% mensual**
  (TNA/12), **monto ganado** y **monto al vencimiento**. El formulario
  muestra una vista previa en vivo con estos cálculos antes de guardar. Se
  pueden crear tantos como haga falta, editar y borrar.
- **Depósitos y retiros durante el plazo**: desde el botón de movimientos de
  cada fila se pueden anotar aportes o retiros con fecha (en cualquier
  momento dentro del plazo), y el **monto ganado**/**monto al vencimiento**
  se recalculan con **interés simple prorrateado por tramo**: cada tramo
  entre movimientos gana intereses sobre el saldo realmente vigente en ese
  tramo (`saldo × TNA/100 × días/365`), sin capitalizar hasta el
  vencimiento. Sin movimientos da exactamente el interés simple de siempre
  (`inicial × (1 + TNA/100 × días/365)`). Un retiro que dejaría el saldo en
  negativo se rechaza.
- **Renovar**: desde el menú (…) de un plazo fijo, "Renovar" cierra ese
  ciclo (queda de solo lectura en el **historial de renovaciones**, fuera de
  los totales activos) y abre uno nuevo pre-cargado con el **monto real al
  vencimiento** como capital inicial, la misma tasa y plazo — todo
  editable, para poder ajustar la TNA, el plazo o el monto en cada
  renovación. El nuevo plazo queda enlazado al anterior (`renewedFromId`).
- **Informe de totales**: tarjetas con **total invertido**, **movimientos
  netos**, **total ganado** y **total al vencimiento**, sumados por moneda
  sobre los plazos fijos **activos** (los ya renovados no se cuentan dos
  veces: su valor "vive" en el plazo que los sucede).

Código: `src/models/pf-dardo.ts` (Mongoose: `PlazoFijo`, con `movements`
embebidos y `renewedFromId`/`renewed` para la cadena de renovaciones),
`src/lib/pf.ts` (matemática pura: fechas e interés prorrateado, libre de
mongoose), `src/features/pf-dardo/` (queries, actions, types).

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
    tags.ts                   Etiquetas de gasto (enum + íconos, libre de mongoose)
    pf.ts                     Plazos fijos: fechas e interés (libre de mongoose)
  models/gastos.ts            Schemas Mongoose (Card, Expense, FixedExpense)
  models/pf-dardo.ts          Schemas Mongoose (PlazoFijo, PfMovement)
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
