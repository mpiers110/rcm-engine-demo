'use client';
import { BarChart, PieChart } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';

import type { Claim, ChartData } from '@/lib/types';
import { theme } from 'tailwind.config';

interface ChartsViewProps {
  claims: Claim[];
}

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export function ChartsView({ claims }: ChartsViewProps) {
  const { countData, amountData } = useMemo(() => {
    const errorCounts: Record<string, number> = {
      'No error': 0,
      'Medical error': 0,
      'Technical error': 0,
      both: 0,
    };
    const errorAmounts: Record<string, number> = {
      'No error': 0,
      'Medical error': 0,
      'Technical error': 0,
      both: 0,
    };

    for (const claim of claims) {
      errorCounts[claim.error_type] = (errorCounts[claim.error_type] || 0) + 1;
      errorAmounts[claim.error_type] =
        (errorAmounts[claim.error_type] || 0) + claim.paid_amount_aed;
    }

    const countData = Object.entries(errorCounts).map(([key, value]) => ({
      category: key,
      count: value,
    })).filter(d => d.count > 0);

    const amountData = Object.entries(errorAmounts).map(([key, value]) => ({
      category: key,
      amount: value,
    })).filter(d => d.amount > 0);

    return { countData, amountData };
  }, [claims]);

  const renderChart = (data: ChartData[], dataKey: 'count' | 'amount', title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={100} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} radius={4}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 pt-4 md:grid-cols-2">
      {renderChart(countData, 'count', 'Claim Counts by Error Category', 'Number of claims for each error type.')}
      {renderChart(amountData, 'amount', 'Paid Amount by Error Category', 'Total paid amount (AED) for each error type.')}
    </div>
  );
}
