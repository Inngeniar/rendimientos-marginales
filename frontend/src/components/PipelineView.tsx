import { AlertTriangle, Bot, CheckCircle2, Layers, User, Users } from "lucide-react";
import type { PipelineResult, ProcessCategory } from "../types/models";
import { PipelineAnalyst } from "./PipelineAnalyst";

export type StageResourceMode = "human" | "bot" | "mix";

export interface EditablePipelineStage {
  name: string;
  category: ProcessCategory;
  avg_time_minutes: number;
  bot_avg_time_minutes: number;
  mode: StageResourceMode;
  assigned_count: number;
  assigned_bots: number;
  pass_through_rate: number;
  share_bot_pool: boolean;
}

interface Props {
  stages: EditablePipelineStage[];
  onChangeStages: (stages: EditablePipelineStage[]) => void;
  onApplyPreset: (preset: "traditional" | "shared_bot" | "relay_bots") => void;
  result: PipelineResult | null;
  botEscalationRate: number;
  humanMonthlyCost: number;
  botMonthlyCost: number;
}

export function PipelineView({
  stages,
  onChangeStages,
  onApplyPreset,
  result,
  botEscalationRate,
  humanMonthlyCost,
  botMonthlyCost,
}: Props) {
  const updateStage = (idx: number, patch: Partial<EditablePipelineStage>) => {
    const next = stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
    onChangeStages(next);
  };

  const maxStageUtil = result
    ? Math.max(...result.stages.map((s) => s.pool_utilization_rate ?? s.utilization_rate))
    : 0;
  const flowHealthy = maxStageUtil <= 0.85;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Flujo Integral Editable: Liquidación → Armado → Auditoría → Radicación
            </h3>
            <p className="text-xs text-slate-500">
              Elige por etapa: solo Humanos, solo Bot RPA o Mixto (Humano + Bot), muestreo de auditoría (%) y pool compartido
            </p>
          </div>
          {result && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                flowHealthy
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                  : "bg-rose-50 text-rose-800 ring-rose-600/20"
              }`}
            >
              {flowHealthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {flowHealthy ? "Límite sano:" : "Cuello:"} {result.bottleneck_stage} · Máx:{" "}
              {result.max_end_to_end_monthly_throughput.toLocaleString()} fact/mes
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
                  st?.is_bottleneck && effectiveUtil > 0.85
                    ? "border-rose-300 bg-rose-50/50 shadow-sm"
                    : st?.is_bottleneck
                      ? "border-emerald-300 bg-emerald-50/30 shadow-sm"
                      : "border-slate-200/80 bg-slate-50/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{cfg.name}</span>
                    {st?.is_bottleneck && effectiveUtil > 0.85 ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Cuello
                      </span>
                    ) : st?.is_bottleneck ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Límite sano
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>

                  {/* Controles editables por etapa */}
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200/70 bg-white p-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateStage(idx, {
                            mode: "human",
                            assigned_count: Math.max(1, cfg.assigned_count),
                            share_bot_pool: false,
                          })
                        }
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[10px] font-semibold transition ${
                          cfg.mode === "human"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <User className="h-3 w-3" /> Humano
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStage(idx, {
                            mode: "bot",
                            assigned_bots: Math.max(1, cfg.assigned_bots || 1),
                          })
                        }
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[10px] font-semibold transition ${
                          cfg.mode === "bot"
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Bot className="h-3 w-3" /> Bot
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStage(idx, {
                            mode: "mix",
                            assigned_count: Math.max(1, cfg.assigned_count || 1),
                            assigned_bots: Math.max(1, cfg.assigned_bots || 1),
                          })
                        }
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-[10px] font-semibold transition ${
                          cfg.mode === "mix"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Users className="h-3 w-3" /> Mixto
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(cfg.mode === "human" || cfg.mode === "mix") && (
                        <label className="flex flex-col text-[11px] text-slate-600">
                          Humanos
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
                      )}

                      {(cfg.mode === "bot" || cfg.mode === "mix") && (
                        <label className="flex flex-col text-[11px] text-violet-700">
                          Bots RPA
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={cfg.assigned_bots}
                            onChange={(e) =>
                              updateStage(idx, { assigned_bots: Math.max(1, Number(e.target.value)) })
                            }
                            className="mt-0.5 rounded border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-900"
                          />
                        </label>
                      )}

                      {cfg.mode === "mix" ? (
                        <>
                          <label className="flex flex-col text-[11px] text-slate-600">
                            T. Humano (min)
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
                          <label className="flex flex-col text-[11px] text-violet-700">
                            T. Bot (min)
                            <input
                              type="number"
                              min={0.5}
                              step={0.5}
                              value={cfg.bot_avg_time_minutes}
                              onChange={(e) =>
                                updateStage(idx, { bot_avg_time_minutes: Math.max(0.5, Number(e.target.value)) })
                              }
                              className="mt-0.5 rounded border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-900"
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex flex-col text-[11px] text-slate-600">
                          Tiempo (min)
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={cfg.mode === "bot" ? cfg.bot_avg_time_minutes : cfg.avg_time_minutes}
                            onChange={(e) => {
                              const val = Math.max(0.5, Number(e.target.value));
                              updateStage(
                                idx,
                                cfg.mode === "bot" ? { bot_avg_time_minutes: val } : { avg_time_minutes: val }
                              );
                            }}
                            className="mt-0.5 rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-900"
                          />
                        </label>
                      )}
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

                    {(cfg.mode === "bot" || cfg.mode === "mix") && (
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

                    {cfg.mode === "mix" && st.human_utilization_rate != null && st.bot_utilization_rate != null && (
                      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-500">
                        <span>Humanos: {(st.human_utilization_rate * 100).toFixed(0)}%</span>
                        <span className="text-violet-700">Bots: {(st.bot_utilization_rate * 100).toFixed(0)}%</span>
                      </div>
                    )}

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
                        <dt>Mínimo / Seguro (≤85%):</dt>
                        <dd className="font-bold tabular-nums text-indigo-700">
                          {st.recommended_count}
                          {st.safe_recommended_count && st.safe_recommended_count > st.recommended_count
                            ? ` / ${st.safe_recommended_count}`
                            : ""}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PipelineAnalyst
        stages={stages}
        result={result}
        botEscalationRate={botEscalationRate}
        humanMonthlyCost={humanMonthlyCost}
        botMonthlyCost={botMonthlyCost}
      />
    </div>
  );
}
