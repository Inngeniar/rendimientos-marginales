import { useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Bot,
  CheckCircle2,
  Compass,
  DollarSign,
  Lightbulb,
  Pin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { PipelineResult } from "../types/models";
import type { EditablePipelineStage } from "./PipelineView";

interface Props {
  stages: EditablePipelineStage[];
  result: PipelineResult | null;
  botEscalationRate: number;
  auxiliarMonthlyCost: number;
  tecnicoMonthlyCost: number;
  botMonthlyCost: number;
  onChangeCosts: (costs: { auxiliar: number; tecnico: number; bot: number }) => void;
}

interface SavedScenarioSnapshot {
  auxiliares: number;
  tecnicos: number;
  bots: number;
  monthlyCost: number;
  costPerInvoice: number;
  maxUtilPct: number;
}

export function PipelineAnalyst({
  stages,
  result,
  botEscalationRate,
  auxiliarMonthlyCost,
  tecnicoMonthlyCost,
  botMonthlyCost,
  onChangeCosts,
}: Props) {
  const [savedRef, setSavedRef] = useState<SavedScenarioSnapshot | null>(null);
  if (!result || result.stages.length === 0) return null;

  const bottleneckIdx = result.stages.findIndex((s) => s.is_bottleneck);
  const bottleneck = bottleneckIdx >= 0 ? result.stages[bottleneckIdx] : result.stages[0];
  const bottleneckCfg = bottleneckIdx >= 0 ? stages[bottleneckIdx] : stages[0];
  const bnUtil = bottleneck.pool_utilization_rate ?? bottleneck.utilization_rate;
  const bnPct = (bnUtil * 100).toFixed(1);
  const isHealthyFlow = bnUtil <= 0.85;

  // Totales reales de equipo en la cadena (respetando roles Auxiliar/Técnico y pool compartido de bots)
  const totalAuxiliares = stages.reduce(
    (acc, st) =>
      acc + ((st.mode === "human" || st.mode === "mix") && (st.human_role ?? "auxiliar") === "auxiliar" ? st.assigned_count : 0),
    0
  );
  const totalTecnicos = stages.reduce(
    (acc, st) =>
      acc + ((st.mode === "human" || st.mode === "mix") && st.human_role === "tecnico" ? st.assigned_count : 0),
    0
  );
  const totalHumans = totalAuxiliares + totalTecnicos;
  const pooledBotMax = stages.reduce(
    (maxB, st) => (st.mode !== "human" && st.share_bot_pool ? Math.max(maxB, st.assigned_bots) : maxB),
    0
  );
  const nonPooledBots = stages.reduce(
    (acc, st) => acc + (st.mode !== "human" && !st.share_bot_pool ? st.assigned_bots : 0),
    0
  );
  const totalBots = pooledBotMax + nonPooledBots;
  const totalAuxCost = totalAuxiliares * auxiliarMonthlyCost;
  const totalTecCost = totalTecnicos * tecnicoMonthlyCost;
  const totalHumanCost = totalAuxCost + totalTecCost;
  const totalBotCost = totalBots * botMonthlyCost;
  const totalMonthlyCost = totalHumanCost + totalBotCost;
  const chainDemand = Math.max(...result.stages.map((s) => s.effective_demand_with_rework), 1);
  const costPerInvoice = totalMonthlyCost / chainDemand;
  const refDiff = savedRef ? savedRef.monthlyCost - totalMonthlyCost : 0;

  const safeRecommendedCount = bottleneck.safe_recommended_count ?? bottleneck.recommended_count;
  const currentBnUnits =
    bottleneckCfg.mode === "bot"
      ? bottleneckCfg.assigned_bots
      : bottleneckCfg.mode === "human"
        ? bottleneckCfg.assigned_count
        : Math.max(bottleneckCfg.assigned_count, bottleneckCfg.assigned_bots);

  // Etapas con holgura o exceso de recursos asignados
  const overstaffedStages = result.stages
    .map((st, idx) => ({ st, cfg: stages[idx] }))
    .filter(({ st, cfg }) => {
      const assigned = cfg.mode === "bot" ? cfg.assigned_bots : cfg.assigned_count;
      const target = st.safe_recommended_count ?? st.recommended_count;
      return !st.is_bottleneck && cfg.mode !== "mix" && assigned > target && target > 0;
    });

  // Etapas distintas al cuello que también superan 85%
  const nearLimitStages = result.stages
    .map((st, idx) => ({ st, cfg: stages[idx] }))
    .filter(({ st }) => {
      const u = st.pool_utilization_rate ?? st.utilization_rate;
      return !st.is_bottleneck && u > 0.85;
    });

  const pooledStages = result.stages.filter((s) => s.shared_pool);
  const poolUtil = pooledStages.length > 0 ? pooledStages[0].pool_utilization_rate ?? 0 : null;

  // Diagnóstico del eslabón más exigido en lenguaje sencillo
  let bottleneckCause = "";
  if (isHealthyFlow) {
    bottleneckCause = `Tu flujo está balanceado y en zona segura: ninguna etapa supera el 85%. La etapa más exigida es ${bottleneck.process_name} (${bnPct}%), que aún conserva ${(100 - bnUtil * 100).toFixed(1)}% de colchón para absorber picos de cierre o imprevistos.`;
  } else if (bottleneck.shared_pool && poolUtil !== null) {
    bottleneckCause = `El pool compartido de ${pooledBotMax} bot(s) (${pooledStages.map((s) => s.process_name).join(" + ")}) suma la carga de ambas tareas y alcanza ${(poolUtil * 100).toFixed(1)}%, superando el límite sano del 85%.`;
  } else if (bnUtil > 1.0) {
    bottleneckCause = `${bottleneck.process_name} recibe más carga (${bottleneck.effective_demand_with_rework.toLocaleString()} cuentas) de la que puede procesar (${bottleneck.stage_monthly_capacity.toLocaleString()}), operando al ${bnPct}%. El excedente se represa y frena las etapas siguientes.`;
  } else {
    bottleneckCause = `${bottleneck.process_name} opera al ${bnPct}% de su capacidad. Aunque alcanza a cubrir el volumen actual, supera el límite sano del 85%: cualquier incapacidad, devolución extra o caída de portal generará cola.`;
  }

  // Recomendaciones matemáticas precisas
  const actions: string[] = [];

  // 1. Ajuste directo en la etapa más exigida si > 85%
  if (!isHealthyFlow) {
    if (bottleneckCfg.mode === "mix" && bottleneck.human_utilization_rate != null && bottleneck.bot_utilization_rate != null) {
      const botSaturated = bottleneck.bot_utilization_rate >= bottleneck.human_utilization_rate;
      if (botSaturated) {
        const autoShare = Math.round((1 - botEscalationRate) * 100);
        actions.push(
          `En ${bottleneck.process_name} (Mixto), el Bot está al ${(bottleneck.bot_utilization_rate * 100).toFixed(0)}% porque intenta absorber el ${autoShare}% de la demanda antes de escalar a humanos. Agregar más humanos no destraba al Bot: suma 1 Bot RPA o sube el "Escalamiento de excepciones" del Bot.`
        );
      } else {
        actions.push(
          `En ${bottleneck.process_name} (Mixto), el límite lo marcan los Humanos (${(bottleneck.human_utilization_rate * 100).toFixed(0)}%) atendiendo excepciones. Agrega 1 Humano en esta etapa para bajar la carga por debajo del 85%.`
        );
      }
    } else if (safeRecommendedCount > currentBnUnits) {
      const projectedUtil = (((bnUtil * currentBnUnits) / safeRecommendedCount) * 100).toFixed(1);
      actions.push(
        `Para llevar ${bottleneck.process_name} a zona segura (≤ 85%), sube de ${currentBnUnits} a ${safeRecommendedCount} ${
          bottleneckCfg.mode === "bot" ? "bot(s)" : "persona(s)"
        } (bajaría de ${bnPct}% a ~${projectedUtil}%).`
      );
    }

    if (bottleneckCfg.mode !== "bot" && bottleneck.category === "auditoria") {
      actions.push(
        `En Auditoría, si el Bot previo ya valida RIPS/soportes, puedes bajar el "% Demanda que pasa" (actual: ${Math.round(
          bottleneckCfg.pass_through_rate * 100
        )}%) o reducir los ${bottleneckCfg.avg_time_minutes} min/cuenta con pre-auditoría automática.`
      );
    }
  }

  // 2. Cálculo exacto de escalamiento óptimo si un pool compartido supera el 85%
  if (poolUtil !== null && poolUtil > 0.85) {
    const currentBotShare = 1 - botEscalationRate;
    const targetBotShare = currentBotShare * (0.82 / poolUtil);
    const targetEscalationPct = Math.min(80, Math.max(5, Math.round((1 - targetBotShare) * 100)));
    actions.push(
      `Optimización sin comprar más bots: tu pool de ${pooledBotMax} bot(s) está al ${(poolUtil * 100).toFixed(1)}%. Si ajustas el "Escalamiento de excepciones" del Bot (pestaña Optimizador) de ${Math.round(
        botEscalationRate * 100
      )}% a ~${targetEscalationPct}% y usas modo Mixto con humanos en esas etapas, el pool bajaría a ~82% manteniendo ${pooledBotMax} bot(s).`
    );
  }

  // 3. Oportunidad de activar pool compartido cuando hay 2+ etapas con bots separados
  const unpooledBotStages = result.stages
    .map((st, idx) => ({ st, cfg: stages[idx] }))
    .filter(({ cfg }) => cfg.mode !== "human" && !cfg.share_bot_pool);

  if (unpooledBotStages.length >= 2) {
    const sumExactBots = unpooledBotStages.reduce((acc, { st, cfg }) => {
      const u = st.bot_utilization_rate ?? st.utilization_rate;
      return acc + u * cfg.assigned_bots;
    }, 0);
    const currentSeparateBots = unpooledBotStages.reduce((acc, { cfg }) => acc + cfg.assigned_bots, 0);
    const recommendedPooledBots = Math.max(1, Math.ceil(sumExactBots / 0.85));
    if (recommendedPooledBots < currentSeparateBots) {
      actions.push(
        `Oportunidad de ahorro en licencias: tienes ${currentSeparateBots} bots separados en ${unpooledBotStages
          .map(({ cfg }) => cfg.name)
          .join(" y ")}, pero juntos solo requieren ${sumExactBots.toFixed(2)} bots reales. Activando "Compartir mismo Bot (pool)" con ${recommendedPooledBots} bots cubrirías ambas etapas (≤ 85%) ahorrando ${
          currentSeparateBots - recommendedPooledBots
        } licencia(s).`
      );
    }
  }

  // 4. Holguras o riesgos secundarios
  if (overstaffedStages.length > 0) {
    const details = overstaffedStages
      .map(({ st, cfg }) => {
        const assigned = cfg.mode === "bot" ? cfg.assigned_bots : cfg.assigned_count;
        const safe = st.safe_recommended_count ?? st.recommended_count;
        return `${st.process_name} (tienes ${assigned}, seguro ≤85%: ${safe})`;
      })
      .join("; ");
    actions.push(
      `Oportunidad de reasignación: hay holgura en ${details}. Reducir o mover ese recurso optimiza el costo mensual sin afectar la meta.`
    );
  }

  if (nearLimitStages.length > 0) {
    actions.push(
      `Riesgo secundario: ${nearLimitStages
        .map(({ st }) => `${st.process_name} (${((st.pool_utilization_rate ?? st.utilization_rate) * 100).toFixed(1)}%)`)
        .join(", ")} también supera el 85%; vigila esa etapa al destrabar la principal.`
    );
  }

  if (actions.length === 0) {
    actions.push(
      `Combinación óptima alcanzada: operas toda la cadena con ${totalHumans} humano(s) y ${totalBots} bot(s) RPA por debajo del 85% de uso, con margen para picos de cierre.`
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Guía y Analista de Combinaciones Eficientes
            </h3>
            <p className="text-xs text-slate-500">
              Equipo total configurado: <strong>{totalHumans} humano(s)</strong> · <strong>{totalBots} bot(s) RPA</strong> · Escalamiento bot: <strong>{Math.round(botEscalationRate * 100)}%</strong>
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isHealthyFlow ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
          }`}
        >
          {isHealthyFlow ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {isHealthyFlow ? "Flujo balanceado (≤ 85%)" : "Requiere ajuste de balanceo"}
        </span>
      </div>

      {/* Bloque Financiero y Comparador de Costo-Efectividad */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Evaluación Financiera y Costo-Efectividad del Flujo
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSavedRef({
                  auxiliares: totalAuxiliares,
                  tecnicos: totalTecnicos,
                  bots: totalBots,
                  monthlyCost: totalMonthlyCost,
                  costPerInvoice,
                  maxUtilPct: Number(bnPct),
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Pin className="h-3 w-3" />
              {savedRef ? "Actualizar Escenario A" : "Fijar como Escenario A"}
            </button>
            {savedRef && (
              <button
                type="button"
                onClick={() => setSavedRef(null)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Costos unitarios editables por rol */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200/80 bg-white p-3 sm:grid-cols-3">
          <label className="flex flex-col text-[11px] text-slate-600">
            <span>Costo Auxiliar ($/mes · carga prestacional)</span>
            <input
              type="number"
              min={0}
              step={100000}
              value={auxiliarMonthlyCost}
              onChange={(e) =>
                onChangeCosts({ auxiliar: Math.max(0, Number(e.target.value)), tecnico: tecnicoMonthlyCost, bot: botMonthlyCost })
              }
              className="mt-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900"
            />
          </label>
          <label className="flex flex-col text-[11px] text-slate-600">
            <span>Costo Técnico ($/mes · Auditoría/Radicación)</span>
            <input
              type="number"
              min={0}
              step={100000}
              value={tecnicoMonthlyCost}
              onChange={(e) =>
                onChangeCosts({ auxiliar: auxiliarMonthlyCost, tecnico: Math.max(0, Number(e.target.value)), bot: botMonthlyCost })
              }
              className="mt-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900"
            />
          </label>
          <label className="flex flex-col text-[11px] text-violet-700">
            <span>Costo Bot RPA ($/mes)</span>
            <input
              type="number"
              min={0}
              step={100000}
              value={botMonthlyCost}
              onChange={(e) =>
                onChangeCosts({ auxiliar: auxiliarMonthlyCost, tecnico: tecnicoMonthlyCost, bot: Math.max(0, Number(e.target.value)) })
              }
              className="mt-1 rounded border border-violet-200 px-2.5 py-1 text-xs font-semibold text-violet-900"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-500">Costo Total Mensual</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              ${totalMonthlyCost.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-500">Costo / Factura</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-indigo-700">
              ${Math.round(costPerInvoice).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-500">Auxiliares ({totalAuxiliares})</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
              ${totalAuxCost.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-500">Técnicos ({totalTecnicos})</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
              ${totalTecCost.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-[11px] text-slate-500">Bots RPA ({totalBots})</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-violet-700">
              ${totalBotCost.toLocaleString()}
            </div>
          </div>
        </div>

        {savedRef && (
          <div
            className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
              refDiff > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : refDiff < 0
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span>
              <strong>
                Comparativa vs. Escenario A ({savedRef.auxiliares} Aux + {savedRef.tecnicos} Téc + {savedRef.bots} Bot · $
                {savedRef.monthlyCost.toLocaleString()}/mes):
              </strong>{" "}
              {refDiff > 0
                ? `Este escenario es más costo-efectivo: ahorras $${refDiff.toLocaleString()}/mes ($${Math.round(
                    savedRef.costPerInvoice - costPerInvoice
                  ).toLocaleString()}/factura menos).`
                : refDiff < 0
                  ? `Este escenario cuesta $${Math.abs(refDiff).toLocaleString()}/mes más que el Escenario A.`
                  : "Mismo costo mensual que el Escenario A."}
            </span>
          </div>
        )}
      </div>

      {/* Bloque 1: Diagnóstico */}
      <div
        className={`rounded-xl border p-4 ${
          isHealthyFlow ? "border-emerald-200/80 bg-emerald-50/40" : "border-rose-200/80 bg-rose-50/40"
        }`}
      >
        <div
          className={`mb-1.5 flex items-center gap-1.5 text-xs font-bold ${
            isHealthyFlow ? "text-emerald-900" : "text-rose-900"
          }`}
        >
          {isHealthyFlow ? (
            <Sparkles className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          {isHealthyFlow
            ? `Estado del eslabón más exigido (${bottleneck.process_name})`
            : `¿Por qué ${bottleneck.process_name} es el cuello de botella actual?`}
        </div>
        <p className="text-xs leading-relaxed text-slate-700">{bottleneckCause}</p>
      </div>

      {/* Bloque 2: Cómo optimizar */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-indigo-950">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {isHealthyFlow ? "Diagnóstico y oportunidades de mejora" : "¿Cómo evitar este cuello y optimizar tu combinación?"}
        </div>
        <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
          {actions.map((act, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{act}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bloque 3: Reglas prácticas */}
      <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <Bot className="h-3.5 w-3.5 text-violet-600" />
            1. ¿Qué automatizar con Bot?
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Asigna <strong>Bot RPA</strong> a tareas repetitivas y estructuradas (Armado ambulatorio, validación RIPS/CUV y Radicación digital). Deja al <strong>Humano</strong> las cuentas complejas (UCI/SOAT) y el muestreo de Auditoría.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
            2. ¿Bot compartido o en relevo?
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Usa <strong>Bot compartido (pool)</strong> cuando las licencias alcancen para Armado + Radicación por debajo del 85% (ahorras licencias). Si supera el 85%, sube el escalamiento a humanos o separa en <strong>Bots en relevo</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            3. Regla de oro del 85%
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Una cadena produce al ritmo de su eslabón más exigido. Procura que ninguna etapa supere el <strong>85%</strong> de uso: ese 15% de colchón absorbe caídas de portales EPS, devoluciones y picos de fin de mes.
          </p>
        </div>
      </div>
    </div>
  );
}
