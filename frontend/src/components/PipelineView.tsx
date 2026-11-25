import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PipelineResult } from "../types/models";

interface Props {
  result: PipelineResult | null;
}

export function PipelineView({ result }: Props) {
  if (!result) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Flujo Integral: Liquidación → Armado de Cuentas → Auditoría → Radicación
          </h3>
          <p className="text-xs text-slate-500">
            Detección de cuellos de botella y capacidad máxima de extremo a extremo
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-600/20">
          <AlertTriangle className="h-3.5 w-3.5" />
          Cuello: {result.bottleneck_stage} · Máx: {result.max_end_to_end_monthly_throughput.toLocaleString()} fact/mes
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {result.stages.map((st) => {
          const pct = Math.min(100, Math.round(st.utilization_rate * 100));
          return (
            <div
              key={st.process_name}
              className={`rounded-xl border p-4 transition ${
                st.is_bottleneck
                  ? "border-rose-300 bg-rose-50/50 shadow-sm"
                  : "border-slate-200/80 bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{st.process_name}</span>
                {st.is_bottleneck ? (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Cuello
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>Utilización</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {(st.utilization_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      st.is_bottleneck ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <dt>Demanda efectiva:</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    {st.effective_demand_with_rework.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Capacidad etapa:</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    {st.stage_monthly_capacity.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200/70 pt-1.5">
                  <dt>Dotación recomendada:</dt>
                  <dd className="font-bold text-indigo-700 tabular-nums">{st.recommended_count}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
