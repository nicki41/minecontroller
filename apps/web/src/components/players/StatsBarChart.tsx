import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/layout/EmptyState";
import { BarChart3 } from "lucide-react";

export interface BarPoint {
  label: string;
  value: number;
}

interface StatsBarChartProps {
  data: BarPoint[];
  color: string;
  valueFormatter: (v: number) => string;
  height?: number;
}

function TooltipContent({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { payload: BarPoint }[];
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-muted-foreground">{point.label}</p>
      <p className="font-medium text-foreground">{valueFormatter(point.value)}</p>
    </div>
  );
}

/** Small categorical bar chart — used for distance-by-category and kills/deaths breakdowns. Keeps its own EmptyState so callers don't have to special-case "all zero". */
export function StatsBarChart({ data, color, valueFormatter, height = 160 }: StatsBarChartProps) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <EmptyState icon={BarChart3} title="No data yet" description="Nothing recorded for this player yet." className="border-0 py-0" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) => valueFormatter(v)}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<TooltipContent valueFormatter={valueFormatter} />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
