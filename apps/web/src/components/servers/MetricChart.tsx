import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/EmptyState";

export interface MetricPoint {
  timestamp: number;
  value: number | null;
}

interface MetricChartProps {
  title: string;
  data: MetricPoint[];
  color: string;
  valueFormatter: (v: number) => string;
  yDomain?: [number | "auto", number | "auto"];
  /** Draw a line across null gaps instead of breaking it — appropriate for intentionally sparse series like disk usage. */
  connectNulls?: boolean;
}

function formatTick(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function TooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { value: number | null }[];
  label?: number;
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-muted-foreground">{new Date(label).toLocaleString()}</p>
      <p className="font-medium text-foreground">{value === null || value === undefined ? "No data" : valueFormatter(value)}</p>
    </div>
  );
}

export function MetricChart({ title, data, color, valueFormatter, yDomain, connectNulls }: MetricChartProps) {
  const hasData = data.some((d) => d.value !== null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[180px] items-center justify-center">
            <EmptyState icon={Activity} title="No data yet" description="Data will appear here once collected." className="border-0 py-0" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTick}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={yDomain ?? [0, "auto"]}
                tickFormatter={(v: number) => valueFormatter(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<TooltipContent valueFormatter={valueFormatter} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.75}
                fill={`url(#fill-${title.replace(/\s+/g, "-")})`}
                connectNulls={connectNulls}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
