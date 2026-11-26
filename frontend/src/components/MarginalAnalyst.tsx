import { AlertTriangle, CheckCircle2, Compass, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { BaselineResult, MarginalResult, ProcessConfig, ResourceProfile } from "../types/models";

interface Props {
  marginal: MarginalResult;
  baseline: BaselineResult | null;
  processCfg: ProcessConfig;
  humanProfile: ResourceProfile;
  congestionAlpha: number;
}

export function MarginalAnalyst({
  marginal,
  baseline,
  processCfg,
  humanProfile,
  congestionAlpha,
}: Props) {
  const curve = marginal.curve;
  if (!curve || curve.length === 0) return null;

  const optStaff = marginal.optimal_staff_for_demand;
  const optIdx = Math.min(Math.max(1, optStaff) - 1, curve.length - 1);
  const optPoint = curve[optIdx];
  const firstPoint = curve[0];

  const currentStaff = Math.max(1, humanProfile.current_headcount);
  const currentIdx = Math.min(currentStaff - 1, curve.length - 1);
  const currentPoint = curve[currentIdx];

  const effectiveDemand =
    baseline?.effective_demand ??
    Math.round(processCfg.expected_monthly_demand * (1 + processCfg.rework_return_rate));
  const reworkVolume = Math.round(processCfg.expected_monthly_demand * processCfg.rework_return_rate);

  const marginalDropPct =
    firstPoint.marginal_output > 0
      ? Math.max(0, Math.round(((firstPoint.marginal_output - optPoint.marginal_output) / firstPoint.marginal_output) * 100))
      : 0;

  const demandCoveredByOpt = optPoint.total_output >= effectiveDemand;
  const staffGap = optStaff - humanProfile.current_headcount;
  const highUtilization = optPoint.utilization_rate > 0.85;

  // Diagnóstico principal en lenguaje claro
  let statusBadge: { label: string; tone: "emerald" | "amber" | "rose" } = {
    label: "Dotación equilibrada",
    tone: "emerald",
  };
  let headline = "";

  if (!demandCoveredByOpt) {
    statusBadge = { label: "Capacidad insuficiente", tone: "rose" };
    headline = `Incluso con ${curve.length} personas (${Math.round(curve[curve.length - 1].total_output).toLocaleString()} fact/mes), no alcanzas a cubrir las ${effectiveDemand.toLocaleString()} facturas/mes requeridas.`;
  } else if (staffGap > 0) {
    statusBadge = { label: `Déficit de ${staffGap} recurso(s)`, tone: "amber" };
    headline = `Con tu equipo actual (${humanProfile.current_headcount} personas) produces ~${Math.round(currentPoint.total_output).toLocaleString()} fact/mes, pero necesitas ${optStaff} personas para cubrir las ${effectiveDemand.toLocaleString()} facturas del mes.`;
  } else if (staffGap < 0) {
    statusBadge = { label: `Excedente de ${Math.abs(staffGap)} recurso(s)`, tone: "emerald" };
    headline = `Tu equipo actual (${humanProfile.current_headcount} personas) supera el mínimo necesario (${optStaff} personas) para cubrir la demanda de ${effectiveDemand.toLocaleString()} facturas/mes.`;
  } else {
    statusBadge = highUtilization
      ? { label: "Equilibrio ajustado (>85% uso)", tone: "amber" }
      : { label: "Dotación óptima", tone: "emerald" };
    headline = `Tu equipo actual (${humanProfile.current_headcount} personas) coincide exactamente con el punto óptimo para cubrir ${effectiveDemand.toLocaleString()} facturas/mes.`;
  }

  // Recomendaciones operacionales concretas
  const recommendations: string[] = [];

  if (!demandCoveredByOpt) {
    recommendations.push(
      "Evalúa el Optimizador Humano + Bot RPA o amplía los días hábiles/SLA: agregar solo más personas ya no escala al mismo ritmo por congestión."
    );
  } else if (staffGap > 0) {
    recommendations.push(
      `Incorpora o reasigna ${staffGap} persona(s) hacia este proceso para evitar represamiento y riesgo de glosas por radicación tardía.`
    );
  } else if (staffGap < 0) {
    const excessCost = Math.abs(staffGap) * humanProfile.monthly_cost;
    recommendations.push(
      `Puedes reasignar ${Math.abs(staffGap)} persona(s) a otra etapa cuello de botella (ej. Auditoría o Armado), liberando ~$${excessCost.toLocaleString()}/mes en capacidad.`
    );
  } else {
    recommendations.push(
      "Mantén la dotación actual y monitorea semanalmente si el volumen real supera el pronóstico."
    );
  }

  if (highUtilization && demandCoveredByOpt) {
    recommendations.push(
      `La ocupación en el punto óptimo es ${(optPoint.utilization_rate * 100).toFixed(1)}% (superior al 85% recomendado). Ante picos de demanda o ausentismo, se formarán colas: considera apoyo RPA o 1 recurso de respaldo.`
    );
  }

  if (marginalDropPct >= 20) {
    recommendations.push(
      `Cada persona nueva rinde ${marginalDropPct}% menos que la primera por fricción de coordinación (α = ${(congestionAlpha * 100).toFixed(1)}%). Divide el equipo en células por EPS o automatiza tareas repetitivas antes de seguir contratando.`
    );
  }

  if (processCfg.rework_return_rate >= 0.08) {
    recommendations.push(
      `El ${(processCfg.rework_return_rate * 100).toFixed(0)}% de devoluciones genera ${reworkVolume.toLocaleString()} facturas extra al mes. Reducir rechazos a la mitad ahorraría trabajo equivalente a ~${Math.max(1, Math.round(reworkVolume / Math.max(1, firstPoint.average_output)))} recurso(s).`
    );
  }

  if (humanProfile.available_hours_per_day > 8) {
    recommendations.push(
      `La jornada de ${humanProfile.available_hours_per_day} h/día activa penalización por fatiga humana: las horas extra producen menos facturas por hora y elevan errores.`
    );
  }

  const badgeClasses =
    statusBadge.tone === "rose"
      ? "bg-rose-100 text-rose-800 ring-rose-600/20"
      : statusBadge.tone === "amber"
        ? "bg-amber-100 text-amber-800 ring-amber-600/20"
        : "bg-emerald-100 text-emerald-800 ring-emerald-600/20";

  const nextStaffPoint = optIdx + 1 < curve.length ? curve[optIdx + 1] : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Analista Operacional de la Gráfica
            </h3>
            <p className="text-xs text-slate-500">
              Interpretación práctica de los rendimientos marginales para toma de decisiones
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClasses}`}>
          {statusBadge.tone === "emerald" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {statusBadge.label}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">{headline}</p>

      {/* 3 tarjetas de lectura rápida */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
            Aporte del 1.er recurso
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {Math.round(firstPoint.marginal_output).toLocaleString()} fact/mes
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Capacidad máxima individual sin congestión
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
            Aporte del recurso #{optStaff}
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-amber-900">
            {Math.round(optPoint.marginal_output).toLocaleString()} fact/mes
          </div>
          <div className="mt-0.5 text-[11px] text-amber-700">
            {marginalDropPct > 0
              ? `${marginalDropPct}% menos que el 1.er recurso`
              : "Sin pérdida marginal relevante"}
          </div>
        </div>

        <div className="rounded-xl bg-indigo-50/70 p-3.5">
          <div className="text-xs font-medium text-indigo-800">Costo / Factura en punto óptimo</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-indigo-950">
            ${Math.round(optPoint.unit_cost).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-indigo-700">
            {nextStaffPoint
              ? `Con ${optStaff + 1} recursos subiría a $${Math.round(nextStaffPoint.unit_cost).toLocaleString()}`
              : `Ocupación proyectada: ${(optPoint.utilization_rate * 100).toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Recomendaciones accionables */}
      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          ¿Qué decisión tomar con estos datos?
        </div>
        <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Guía rápida de lectura de las 3 curvas */}
      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 sm:grid-cols-3">
        <div>
          <span className="font-semibold text-indigo-700">● Producto Total:</span> Total de facturas que saca el equipo completo al mes.
        </div>
        <div>
          <span className="font-semibold text-sky-600">● Producto Medio:</span> Promedio de facturas por persona; baja cuando hay congestión.
        </div>
        <div>
          <span className="font-semibold text-amber-600">● Producto Marginal:</span> Facturas extra que aporta la última persona agregada.
        </div>
      </div>
    </div>
  );
}
