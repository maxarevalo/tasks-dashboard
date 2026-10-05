/**
 * Mapa del dinero: qué acciones mueven plata real entre cuentas (verde), cuáles
 * corrigen contra el banco (ámbar, punteado) y qué alimenta la proyección (gris).
 */
const MONEY = "#0f766e";
const MONEY_SOFT = "#e6f4f1";
const CHECK = "#b45309";
const CHECK_SOFT = "#fbf0e2";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const FG = "#0f172a";

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  fill = "#ffffff",
  stroke = LINE,
  color = FG,
  subColor = MUTED,
  strokeWidth = 1,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string[];
  fill?: string;
  stroke?: string;
  color?: string;
  subColor?: string;
  strokeWidth?: number;
  dashed?: boolean;
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <text x={cx} y={y + 25} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>
        {title}
      </text>
      {sub.map((line, i) => (
        <text key={i} x={cx} y={y + 44 + i * 18} textAnchor="middle" fontSize={11} fill={subColor}>
          {line}
        </text>
      ))}
    </g>
  );
}

export function MoneyMap() {
  return (
    <svg
      viewBox="0 0 960 440"
      className="block h-auto w-full min-w-[720px]"
      role="img"
      aria-label="Mapa del dinero: Cobrar suma a las cuentas, Pagar resta de las cuentas, Transferir mueve entre cuentas, el cierre de mes corrige contra el banco, y la proyección suma el saldo de las cuentas y los ingresos por cobrar y resta los gastos pendientes y lo disponible de los presupuestos."
    >
      <defs>
        {[
          ["mm-money", MONEY],
          ["mm-check", CHECK],
          ["mm-calc", MUTED],
        ].map(([id, color]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        ))}
      </defs>

      <Box x={380} y={14} w={200} h={52} title="Tu banco (real)" sub={["fuera de la app"]}
        fill={CHECK_SOFT} stroke={CHECK} color={CHECK} subColor={CHECK} strokeWidth={1.5} dashed />
      <Box x={24} y={130} w={190} h={64} title="Ingresos" sub={["estimados · por cobrar / cobrados"]} />
      <Box x={380} y={130} w={200} h={84} title="Cuentas de ahorro"
        sub={["saldo + historial de movimientos", "ARS y USD por separado"]}
        fill={MONEY_SOFT} stroke={MONEY} color={MONEY} subColor={MONEY} strokeWidth={2} />
      <Box x={746} y={130} w={190} h={64} title="Gastos cargados" sub={["pendientes / pagados"]} />
      <Box x={746} y={350} w={190} h={64} title="Presupuestos" sub={["por etiqueta, ej. Combustible"]} />
      <Box x={380} y={350} w={200} h={64} title="Disponible y proyección" sub={["Estado contable"]}
        stroke={FG} strokeWidth={1.5} />

      {/* Plata real */}
      <g stroke={MONEY} strokeWidth={2.5} fill="none">
        <line x1={214} y1={162} x2={378} y2={162} markerEnd="url(#mm-money)" />
        <line x1={580} y1={162} x2={744} y2={162} markerEnd="url(#mm-money)" />
        <path d="M 380 196 C 330 240, 330 120, 378 140" markerEnd="url(#mm-money)" />
      </g>
      <g fontSize={12} fontWeight={700} fill={MONEY}>
        <text x={296} y={153} textAnchor="middle">Cobrar</text>
        <text x={662} y={153} textAnchor="middle">Pagar</text>
        <text x={316} y={232} textAnchor="end">Transferir</text>
      </g>
      <g fontSize={11} fill={MUTED}>
        <text x={296} y={180} textAnchor="middle">+ a 1 o más cuentas</text>
        <text x={662} y={180} textAnchor="middle">− de la cuenta elegida</text>
      </g>

      {/* Cierre de mes */}
      <g stroke={CHECK} strokeWidth={2} fill="none" strokeDasharray="6 4">
        <line x1={480} y1={66} x2={480} y2={128} markerEnd="url(#mm-check)" />
        <path d="M 580 40 C 720 40, 830 70, 836 128" markerEnd="url(#mm-check)" />
      </g>
      <g fontSize={11} fontWeight={600} fill={CHECK}>
        <text x={488} y={100}>cierre: ajuste</text>
        <text x={600} y={30}>cierre: gasto “No registrado”</text>
      </g>

      {/* Cálculo de la proyección */}
      <g stroke={MUTED} strokeWidth={1.5} fill="none">
        <line x1={480} y1={214} x2={480} y2={348} markerEnd="url(#mm-calc)" />
        <path d="M 119 194 C 119 300, 250 382, 378 382" markerEnd="url(#mm-calc)" />
        <path d="M 800 194 C 760 290, 650 370, 582 370" markerEnd="url(#mm-calc)" />
        <line x1={746} y1={398} x2={582} y2={398} markerEnd="url(#mm-calc)" />
        <line x1={880} y1={194} x2={880} y2={348} markerEnd="url(#mm-calc)" />
      </g>
      <g fontSize={11} fill={MUTED}>
        <text x={488} y={290}>saldo actual</text>
        <text x={168} y={318}>+ lo que falta cobrar</text>
        <text x={640} y={262} textAnchor="middle">− lo que falta pagar</text>
        <text x={664} y={414} textAnchor="middle">− lo disponible</text>
        <text x={872} y={262} textAnchor="end">lo gastado con</text>
        <text x={872} y={276} textAnchor="end">la etiqueta</text>
        <text x={872} y={290} textAnchor="end">lo descuenta</text>
      </g>
    </svg>
  );
}
