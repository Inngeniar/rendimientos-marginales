import { AlertCircle, ArrowRightLeft, Bot, CheckCircle2, Compass, Lightbulb, ShieldAlert } from "lucide-react";
import type { PipelineResult } from "../types/models";
import type { EditablePipelineStage } from "./PipelineView";

interface Props {
  stages: EditablePipelineStage[];
  result: PipelineResult | null;
}

export function PipelineAnalyst({ stages, result }: Props) {
  if (!result || result.stages.length === 0) return null;

  const bottleneckIdx = result.stages.findIndex((s) => s.is_bottleneck);
  const bottleneck = bottleneckIdx >= 0 ? result.stages[bottleneckIdx] : result.stages[0];
  const bottleneckCfg = bottleneckIdx >= 0 ? stages[bottleneckIdx] : stages[0];
  const bnUtil = bottleneck.pool_utilization_rate ?? bottleneck.utilization_rate;
  const bnPct = (bnUtil * 100).toFixed(1);

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
      return !st.is_bottleneck && cfg.mode !== "mix" && assigned > st.recommended_count && st.recommended_count > 0;
    });

  // Etapas distintas al cuello que también superan 85% (riesgo secundario)
  const nearLimitStages = result.stages
    .map((st, idx) => ({ st, cfg: stages[idx] }))
    .filter(({ st }) => {
      const u = st.pool_utilization_rate ?? st.utilization_rate;
      return !st.is_bottleneck && u > 0.85;
    });

  // Uso de pool compartido si existe
  const pooledStages = result.stages.filter((s) => s.shared_pool);
  const poolUtil = pooledStages.length > 0 ? pooledStages[0].pool_utilization_rate ?? 0 : null;

  // Diagnóstico del cuello de botella en lenguaje sencillo
  let bottleneckCause = "";
  if (bottleneck.shared_pool && poolUtil !== null) {
    bottleneckCause = `El grupo de bots compartidos (${pooledStages.map((s) => s.process_name).join(" + ")}) está sumando los tiempos de ambas tareas y alcanza ${(poolUtil * 100).toFixed(1)}% de uso. Cuando un mismo bot hace dos pasos seguidos sin suficiente margen, frena toda la cadena.`;
  } else if (bnUtil > 1.0) {
    bottleneckCause = `${bottleneck.process_name} recibe más trabajo (${bottleneck.effective_demand_with_rework.toLocaleString()} cuentas) del que puede procesar (${bottleneck.stage_monthly_capacity.toLocaleString()} cuentas), operando al ${bnPct}%. Todo lo que sobrepasa el 100% se acumula en fila y retrasa las etapas siguientes.`;
  } else if (bnUtil > 0.85) {
    bottleneckCause = `${bottleneck.process_name} opera al ${bnPct}% de su capacidad (${bottleneck.effective_demand_with_rework.toLocaleString()} de ${bottleneck.stage_monthly_capacity.toLocaleString()} cuentas). Aunque en papel alcanza, supera el límite sano del 85%: cualquier pico de cierre, incapacidad o falla de portal genera cola inmediata.`;
  } else {
    bottleneckCause = `El flujo está balanceado: ${bottleneck.process_name} es la etapa más exigida (${bnPct}%), pero se mantiene por debajo del 85% recomendado, dejando margen operativo para imprevistos.`;
  }

  // Acciones concretas para evitar o destrabar el cuello
  const actions: string[] = [];

  if (bnUtil > 0.85) {
    if (bottleneckCfg.mode === "mix" && bottleneck.human_utilization_rate != null && bottleneck.bot_utilization_rate != null) {
      const subTarget =
        bottleneck.bot_utilization_rate >= bottleneck.human_utilization_rate ? "Bots RPA" : "Humanos";
      actions.push(
        `En ${bottleneck.process_name} (modo Mixto), el límite lo está marcando el equipo de ${subTarget}. Sube 1 unidad de ${subTarget} para llevar la etapa por debajo del 85%.`
      );
    } else if (safeRecommendedCount > currentBnUnits) {
      const projectedUtil = ((bnUtil * currentBnUnits) / safeRecommendedCount * 100).toFixed(1);
      actions.push(
        `Aumenta ${bottleneck.process_name} de ${currentBnUnits} a ${safeRecommendedCount} ${
          bottleneckCfg.mode === "bot" ? "bot(s)" : "persona(s)"
        }: su ocupación bajaría de ${bnPct}% a ~${projectedUtil}% (zona segura ≤ 85%).`
      );
    }
    if (bottleneckCfg.mode !== "bot" && bottleneck.category === "auditoria") {
      actions.push(
        `Si el Bot de Armado ya valida RIPS/soportes antes, puedes bajar el "% Demanda que pasa" en Auditoría (actual: ${Math.round(
          bottleneckCfg.pass_through_rate * 100
        )}%) o usar listas de chequeo automáticas para reducir los ${bottleneckCfg.avg_time_minutes} min/cuenta.`
      );
    }
    if (bottleneck.shared_pool && poolUtil !== null && poolUtil > 0.85) {
      actions.push(
        "Como el pool compartido superó el 85%, agrega un bot más al pool o desmarca 'Compartir mismo Bot' para separar Armado y Radicación en bots independientes (en relevo)."
      );
    }
  }

  if (overstaffedStages.length > 0) {
    const details = overstaffedStages
      .map(({ st, cfg }) => {
        const assigned = cfg.mode === "bot" ? cfg.assigned_bots : cfg.assigned_count;
        return `${st.process_name} (tienes ${assigned}, mínimo ${st.recommended_count})`;
      })
      .join("; ");
    actions.push(
      `Reasigna capacidad ociosa: hay holgura en ${details}. Mover ese recurso o reducir esa asignación optimiza el costo mensual sin afectar la producción.`
    );
  }

  if (nearLimitStages.length > 0) {
    actions.push(
      `Atención secundaria: ${nearLimitStages
        .map(({ st }) => `${st.process_name} (${((st.pool_utilization_rate ?? st.utilization_rate) * 100).toFixed(1)}%)`)
        .join(", ")} también supera el 85%; si destrabas el cuello actual, ese será el siguiente punto de congestión.`
    );
  }

  if (actions.length === 0) {
    actions.push(
      "Tu combinación actual tiene buena holgura en todas las etapas (≤ 85%). Puedes probar subir el volumen mensual o reducir 1 recurso en la etapa menos cargada para validar ahorro."
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
              Explicación en lenguaje claro de por qué ocurre el cuello de botella y cómo optimizar el flujo
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            bnUtil > 0.85
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {bnUtil > 0.85 ? (
            <ShieldAlert className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {bnUtil > 0.85 ? "Requiere ajuste de balanceo" : "Flujo balanceado (≤ 85%)"}
        </span>
      </div>

      {/* Bloque 1: Por qué se genera este cuello de botella */}
      <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          ¿Por qué {bottleneck.process_name} es el cuello de botella actual?
        </div>
        <p className="text-xs leading-relaxed text-slate-700">{bottleneckCause}</p>
      </div>

      {/* Bloque 2: Cómo evitarlo / qué cambiar ahora */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-indigo-950">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          ¿Cómo evitar este cuello y mejorar tu combinación?
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

      {/* Bloque 3: Reglas prácticas para combinar Humano + Bot sin ser experto */}
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
            Usa <strong>Bot compartido (pool)</strong> cuando una licencia alcance a hacer Armado + Radicación por debajo del 85% (ahorras licencias). Si supera el 85%, separa en <strong>2 Bots en relevo</strong> para trabajar en paralelo.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            3. Regla de oro del 85%
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Una cadena produce al ritmo de su eslabón más lento. Procura que ninguna etapa supere el <strong>85%</strong> de uso: ese 15% de colchón absorbe caídas de portales EPS, devoluciones y picos de fin de mes.
          </p>
        </div>
      </div>
    </div>
  );
}
