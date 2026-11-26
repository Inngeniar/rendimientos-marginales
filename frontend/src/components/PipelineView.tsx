import { AlertTriangle, Bot, CheckCircle2, Layers, User } from "lucide-react";
import type { PipelineResult, ProcessCategory, ResourceType } from "../types/models";
import { PipelineAnalyst } from "./PipelineAnalyst";

export interface EditablePipelineStage {
  name: string;
  category: ProcessCategory;
  avg_time_minutes: number;
  resource_type: ResourceType;
  assigned_count: number;
  pass_through_rate: number;
  share_bot_pool: boolean;
}

interface Props {
  stages: EditablePipelineStage[];
  onChangeStages: (stages: EditablePipelineStage[]) => void;
  onApplyPreset: (preset: "traditional" | "shared_bot" | "relay_bots") => void;
  result: PipelineResult | null;
}

export function PipelineView({ stages, onChangeStages, onApplyPreset, result }: Props) {
  const updateStage = (idx: number, patch: Partial<EditablePipelineStage>) => {
    const next = stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
    onChangeStages(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Flujo Integral Editable: Liquidación → Armado → Auditoría → Radicación
            </h3>
            <p className="text-xs text-slate-500">
              Configura recursos (Humano o Bot RPA), muestreo aleatorio de auditoría (%) y pool compartido de bots
            </p>
          </div>
          {result && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-600/20">
              <AlertTriangle className="h-3.5 w-3.5" />
              Cuello: {result.bottleneck_stage} · Máx: {result.max_end_to_end_monthly_throughput.toLocaleString()} fact/mes
            </span>
          )}
        </div>

        {/* Presets rápidos de arquitectura operativa */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            Escenarios rápidos:
          </span>
          <button
            type="button"
            onClick={() => onApplyPreset("traditional")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            100% Humano (Tradicional)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset("shared_bot")}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Bot Compartido (Armado + Radicación) + Auditoría 10%
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset("relay_bots")}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Doble Bot en Relevo (Bot 1 → Auditoría 10% → Bot 2)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stages.map((cfg, idx) => {
            const st = result?.stages[idx];
            const effectiveUtil = st?.pool_utilization_rate ?? st?.utilization_rate ?? 0;
            const pct = Math.min(100, Math.round(effectiveUtil * 100));

            return (
              <div
                key={cfg.name}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  st?.is_bottleneck
                    ? "border-rose-300 bg-rose-50/50 shadow-sm"
                    : "border-slate-200/80 bg-slate-50/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{cfg.name}</span>
                    {st?.is_bottleneck ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Cuello
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>

                  {/* Controles editables por etapa */}
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200/70 bg-white p-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateStage(idx, { resource_type: "human", share_bot_pool: false })}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition ${
                          cfg.resource_type === "human"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <User className="h-3 w-3" /> Humano
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStage(idx, { resource_type: "bot" })}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition ${
                          cfg.resource_type === "bot"
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Bot className="h-3 w-3" /> Bot RPA
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col text-[11px] text-slate-600">
                        Cantidad
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={cfg.assigned_count}
                          onChange={(e) =>
                            updateStage(idx, { assigned_count: Math.max(1, Number(e.target.value)) })
                          }
                          className="mt-0.5 rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-900"
                        />
                      </label>
                      <label className="flex flex-col text-[11px] text-slate-600">
                        Tiempo (min)
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={cfg.avg_time_minutes}
                          onChange={(e) =>
                            updateStage(idx, { avg_time_minutes: Math.max(0.5, Number(e.target.value)) })
                          }
                          className="mt-0.5 rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-900"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col text-[11px] text-slate-600">
                      <span className="flex justify-between">
                        <span>% Demanda que pasa</span>
                        <span className="font-semibold text-indigo-700">
                          {Math.round(cfg.pass_through_rate * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={cfg.pass_through_rate}
                        onChange={(e) => updateStage(idx, { pass_through_rate: Number(e.target.value) })}
                        className="mt-1 accent-indigo-600"
                      />
                    </label>

                    {cfg.resource_type === "bot" && (
                      <label className="flex cursor-pointer items-center gap-1.5 pt-0.5 text-[11px] font-medium text-violet-800">
                        <input
                          type="checkbox"
                          checked={cfg.share_bot_pool}
                          onChange={(e) => updateStage(idx, { share_bot_pool: e.target.checked })}
                          className="rounded accent-violet-600"
                        />
                        Compartir mismo Bot (pool)
                      </label>
                    )}
                  </div>
                </div>

                {/* Resultados calculados */}
                {st && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                      <span>{st.shared_pool ? "Uso pool bot" : "Utilización"}</span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {(effectiveUtil * 100).toFixed(1)}%
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

                    <dl className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <dt>Demanda etapa:</dt>
                        <dd className="font-medium tabular-nums text-slate-900">
                          {st.effective_demand_with_rework.toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Capacidad etapa:</dt>
                        <dd className="font-medium tabular-nums text-slate-900">
                          {st.stage_monthly_capacity.toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/70 pt-1">
                        <dt>Recomendado:</dt>
                        <dd className="font-bold tabular-nums text-indigo-700">{st.recommended_count}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PipelineAnalyst stages={stages} result={result} />
    </div>
  );
}
