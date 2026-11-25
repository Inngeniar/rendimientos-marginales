import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarginalPoint } from "../types/models";

interface Props {
  curve: MarginalPoint[];
  optimalStaff: number;
}

export function MarginalChart({ curve, optimalStaff }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Curva de Rendimientos Marginales
          </h3>
          <p className="text-xs text-slate-500">
            Evolución de Producto Total, Medio y Marginal al escalar la dotación
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/15">
          Punto óptimo demanda: {optimalStaff} recurso(s)
        </span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="totalOutputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="staff_count"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "N° Recursos", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#64748b" }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            <ReferenceLine
              yAxisId="left"
              x={optimalStaff}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={2}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="total_output"
              name="Producto Total (fact/mes)"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#totalOutputGrad)"
              dot={{ r: 3, fill: "#4f46e5" }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="average_output"
              name="Producto Medio (fact/recurso)"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="marginal_output"
              name="Producto Marginal (Δ fact)"
              stroke="#f59e0b"
              strokeWidth={2.2}
              strokeDasharray="5 4"
              dot={{ r: 2.5, fill: "#f59e0b" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
