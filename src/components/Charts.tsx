// Small hand-rolled SVG charts for the dashboard. Colors come from the --chart-*
// tokens in global.css (validated for light and dark), never from data order.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';

/** Tracks an element's content width so charts can lay out in real pixels. */
function useWidth<T extends HTMLElement>(fallback = 320): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width];
}

interface TipState {
  x: number;
  y: number;
  value: string;
  label: string;
}

/** Tooltip: the value leads, the label follows. */
function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      <strong>{tip.value}</strong>
      <span>{tip.label}</span>
    </div>
  );
}

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

interface CardProps {
  title: string;
  subtitle?: ReactNode;
  /** The same numbers as the chart, for screen readers and anyone who prefers a table. */
  table?: TableData;
  className?: string;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, table, className = '', children }: CardProps) {
  return (
    <section className={`chart-card ${className}`}>
      <header className="chart-card__header">
        <h2>{title}</h2>
        {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
      </header>
      {children}
      {table && (
        <details className="chart-card__table">
          <summary>View as table</summary>
          <table>
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{typeof cell === 'number' ? cell.toLocaleString() : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

/** A clean axis step (1, 2, 5 × 10ⁿ) giving at most `maxTicks` ticks above zero. */
function niceStep(max: number, maxTicks = 4): number {
  const raw = max / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
}

/** Column with a 4px rounded data end and a square base. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export interface ColumnDatum {
  key: string;
  /** Tick text under the column; omit to leave the slot unlabeled. */
  axisLabel?: string;
  /** Full label for the tooltip, e.g. "Mon, Mar 9". */
  label: string;
  value: number;
}

interface ColumnProps {
  data: ColumnDatum[];
  /** Noun for values in the tooltip ("words", "reviews"). */
  unit: string;
  /** Optional reference line, e.g. the daily goal. */
  goal?: { value: number; label: string };
  height?: number;
  ariaLabel: string;
}

const M = { top: 10, right: 6, bottom: 22, left: 28 };

export function ColumnChart({ data, unit, goal, height = 170, ariaLabel }: ColumnProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(width - M.left - M.right, 40);
  const plotH = height - M.top - M.bottom;
  const max = Math.max(1, goal?.value ?? 0, ...data.map((d) => d.value));
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const band = plotW / data.length;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH;
  const xCenter = (i: number) => M.left + band * i + band / 2;

  const tip: TipState | null =
    active === null
      ? null
      : {
          x: Math.min(Math.max(xCenter(active), 60), width - 60),
          y: y(data[active].value) - 8,
          value: `${data[active].value.toLocaleString()} ${data[active].value === 1 ? unit.replace(/s$/, '') : unit}`,
          label: data[active].label,
        };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' ? -1 : 1;
    setActive((i) => Math.min(Math.max((i ?? data.length) + delta, 0), data.length - 1));
  };

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        role="group"
        aria-label={`${ariaLabel}. Use the arrow keys to read each day.`}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((i) => i ?? data.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'chart-axis' : 'chart-grid'} x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          d.value > 0 ? (
            <path
              key={d.key}
              className={`chart-column${active === i ? ' is-active' : ''}`}
              d={columnPath(xCenter(i) - barW / 2, y(d.value), barW, y(0) - y(d.value))}
            />
          ) : null,
        )}
        {goal && (
          <g className="chart-goal">
            <line x1={M.left} x2={width - M.right} y1={y(goal.value)} y2={y(goal.value)} />
            <text x={width - M.right} y={y(goal.value) - 4} textAnchor="end">
              {goal.label}
            </text>
          </g>
        )}
        {data.map((d, i) =>
          d.axisLabel ? (
            <text key={d.key} className="chart-tick" x={xCenter(i)} y={height - 6} textAnchor="middle">
              {d.axisLabel}
            </text>
          ) : null,
        )}
        {/* Hit targets span the whole band, so nobody has to land on a thin column. */}
        {data.map((d, i) => (
          <rect
            key={d.key}
            className="chart-hit"
            x={M.left + band * i}
            y={M.top}
            width={band}
            height={plotH}
            onPointerEnter={() => setActive(i)}
          />
        ))}
        {active !== null && (
          <line className="chart-crosshair" x1={xCenter(active)} x2={xCenter(active)} y1={M.top} y2={y(0)} />
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  /** CSS color, usually a var(--chart-*) token. */
  color: string;
  note?: string;
}

/** Donut for one whole split into a few ordered parts, with a legend that carries every number. */
export function DonutChart({ segments, centerLabel }: { segments: Segment[]; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0).length;
  const gap = visible > 1 ? 2 : 0; // surface gap between parts, in px along the ring

  let offset = 0;
  const arcs = segments.map((s, i) => {
    const length = total ? (s.value / total) * circumference : 0;
    const arc = { i, s, start: offset, length };
    offset += length;
    return arc;
  });
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const shown = active !== null ? segments[active] : null;

  return (
    <div className="donut">
      <div className="donut__figure">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle className="donut__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {arcs.map(({ i, s, start, length }) =>
              length > 0 ? (
                <circle
                  key={s.label}
                  className={`donut__arc${active === i ? ' is-active' : ''}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(length - gap, 0.5)} ${circumference}`}
                  strokeDashoffset={-start}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                />
              ) : null,
            )}
          </g>
        </svg>
        <div className="donut__center" aria-hidden="true">
          {shown ? (
            <>
              <strong>{shown.value.toLocaleString()}</strong>
              <span>
                {shown.label} · {pct(shown.value)}%
              </span>
            </>
          ) : (
            <>
              <strong>{total.toLocaleString()}</strong>
              <span>{centerLabel}</span>
            </>
          )}
        </div>
      </div>
      <ul className="legend legend--list">
        {segments.map((s, i) => (
          <li
            key={s.label}
            className={active === i ? 'is-active' : ''}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <span className="legend__swatch" style={{ background: s.color }} />
            <span className="legend__name">
              {s.label}
              {s.note && <span className="legend__note">{s.note}</span>}
            </span>
            <span className="legend__value">
              {s.value.toLocaleString()} <span className="legend__pct">{pct(s.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ProgressRow {
  label: string;
  total: number;
  /** Parts filled from the left, e.g. mastered then still learning. */
  parts: { label: string; value: number; color: string }[];
}

/** One meter per row: filled parts over a track for what's left. */
export function ProgressBars({ rows }: { rows: ProgressRow[] }) {
  const legend = rows[0]?.parts ?? [];
  return (
    <>
      <ul className="legend legend--inline" aria-hidden="true">
        {legend.map((p) => (
          <li key={p.label}>
            <span className="legend__swatch" style={{ background: p.color }} />
            {p.label}
          </li>
        ))}
        <li>
          <span className="legend__swatch legend__swatch--track" />
          Not started
        </li>
      </ul>
      <ul className="progress-rows">
        {rows.map((row) => {
          const done = row.parts.reduce((n, p) => n + p.value, 0);
          const summary = row.parts.map((p) => `${p.value} ${p.label.toLowerCase()}`).join(', ');
          return (
            <li key={row.label} className="progress-row">
              <span className="progress-row__label">{row.label}</span>
              <span
                className="progress-row__bar"
                role="img"
                aria-label={`${row.label}: ${done} of ${row.total} words (${summary})`}
              >
                {row.parts.map((p) =>
                  p.value > 0 ? (
                    <span
                      key={p.label}
                      className="progress-row__part"
                      style={{ width: `${(p.value / row.total) * 100}%`, background: p.color }}
                      title={`${p.label}: ${p.value.toLocaleString()}`}
                    />
                  ) : null,
                )}
              </span>
              <span className="progress-row__value">
                {done.toLocaleString()} <span className="muted">/ {row.total.toLocaleString()}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export interface HeatCell {
  key: string;
  label: string;
  value: number;
  /** 0 (none) to 4 (most). */
  level: number;
}

const CELL_GAP = 3;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** Calendar heatmap: one column per week, Monday at the top. */
export function Heatmap({
  weeks,
  monthLabel,
  unit,
  cell: CELL = 12,
}: {
  weeks: (HeatCell | null)[][];
  monthLabel: (weekIndex: number) => string | undefined;
  unit: string;
  /** Cell size in px. */
  cell?: number;
}) {
  const [tip, setTip] = useState<TipState | null>(null);
  const left = 28;
  const top = 16;
  const width = left + weeks.length * (CELL + CELL_GAP);
  const height = top + 7 * (CELL + CELL_GAP);

  return (
    <div className="chart heatmap" onPointerLeave={() => setTip(null)}>
      <svg width={width} height={height} aria-hidden="true">
        {weeks.map((_, w) => {
          const label = monthLabel(w);
          return label ? (
            <text key={w} className="chart-tick" x={left + w * (CELL + CELL_GAP)} y={10}>
              {label}
            </text>
          ) : null;
        })}
        {WEEKDAYS.map((d, i) =>
          d ? (
            <text key={d} className="chart-tick" x={0} y={top + i * (CELL + CELL_GAP) + CELL - 2}>
              {d}
            </text>
          ) : null,
        )}
        {weeks.map((week, w) =>
          week.map((cell, d) =>
            cell ? (
              <rect
                key={cell.key}
                className={`heat-cell heat-${cell.level}`}
                x={left + w * (CELL + CELL_GAP)}
                y={top + d * (CELL + CELL_GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                onPointerEnter={() =>
                  setTip({
                    x: Math.min(Math.max(left + w * (CELL + CELL_GAP) + CELL / 2, 60), width - 60),
                    y: top + d * (CELL + CELL_GAP) - 4,
                    value: `${cell.value.toLocaleString()} ${cell.value === 1 ? unit.replace(/s$/, '') : unit}`,
                    label: cell.label,
                  })
                }
              />
            ) : null,
          ),
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Lets a chart take the card's full width while it measures (for the heatmap's week count). */
export function useContainerWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  return useWidth<T>();
}
