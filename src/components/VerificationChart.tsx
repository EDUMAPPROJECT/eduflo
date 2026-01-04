import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface VerificationStats {
  pending: number;
  approved: number;
  rejected: number;
}

interface VerificationChartProps {
  stats: VerificationStats;
}

const COLORS = {
  pending: "hsl(var(--warning))",
  approved: "hsl(var(--primary))",
  rejected: "hsl(var(--destructive))",
};

const VerificationChart = ({ stats }: VerificationChartProps) => {
  const data = [
    { name: "대기중", value: stats.pending, color: COLORS.pending },
    { name: "승인됨", value: stats.approved, color: COLORS.approved },
    { name: "거절됨", value: stats.rejected, color: COLORS.rejected },
  ].filter(item => item.value > 0);

  const total = stats.pending + stats.approved + stats.rejected;

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}건`, ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VerificationChart;
