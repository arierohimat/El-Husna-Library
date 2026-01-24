"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopBorrowersChartProps {
  data: {
    name: string;
    total: number;
  }[];
}

export function TopBorrowersChart({ data }: TopBorrowersChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center">
        Belum ada data peminjaman
      </p>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
