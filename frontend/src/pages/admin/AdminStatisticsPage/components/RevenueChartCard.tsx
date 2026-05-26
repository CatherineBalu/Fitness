import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

import { formatCurrency } from '../formatCurrency';

import type { RevenuePoint } from '../adminStatistics.types';

const chartConfig = {
  total: { label: 'Revenue', color: 'var(--color-chart-1)' },
} satisfies ChartConfig;

interface RevenueChartCardProps {
  data: RevenuePoint[];
  isLoading: boolean;
}

export default function RevenueChartCard({
  data,
  isLoading,
}: RevenueChartCardProps) {
  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;
  if (data.length === 0) return <EmptyState message="No payment data yet." />;

  return (
    <Card>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-70 w-full">
          <BarChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => formatCurrency(Number(v))}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
