import { Area, AreaChart, ResponsiveContainer } from "recharts";

export interface SparklinePoint {
  timestamp: number;
  value: number | null;
}

/**
 * Compact load indicator for the dashboard server cards — no axes/grid/
 * tooltip, unlike the full MetricChart used on the server Overview page.
 */
export function Sparkline({ data, color, height = 32 }: { data: SparklinePoint[]; color: string; height?: number }) {
  const hasData = data.some((d) => d.value !== null);
  if (!hasData) {
    return <div style={{ height }} className="flex items-center text-xs text-muted-foreground">No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#sparkline-fill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
