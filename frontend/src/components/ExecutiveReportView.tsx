import { FileText, Printer } from "lucide-react";
import type {
  BaselineResult,
  MarginalResult,
  MixOptimizeResult,
  PricingSimulationResult,
  ProcessConfig,
  ResourceProfile,
} from "../types/models";

interface Props {
  processCfg: ProcessConfig;
  humanProfile: ResourceProfile;
  botProfile: ResourceProfile;
  baseline: BaselineResult | null;
  marginal: MarginalResult | null;
  mixResult: MixOptimizeResult | null;
  pricingResult: PricingSimulationResult | null;
}

export function ExecutiveReportView({
  processCfg,
  humanProfile,
  botProfile,
  baseline,
  marginal,
  mixResult,
  pricingResult,
}: Props) {
  if (!baseline) return null;

  const soloHumanCost = baseline.required_resources_rounded * humanProfile.monthly_cost;
  const savings = mixResult?.feasible ? soloHumanCost - mixResult.total_monthly_cost : 0;

  const conclusions: string[] = [
    `Para procesar ${baseline.effective_demand.toLocaleString()} facturas/mes en "${processCfg.name}" (${processCfg.category} · ${processCfg.complexity}), la meta operativa óptima es de ${baseline.optimal_daily_production.toLocaleString()} facturas/día (${baseline.optimal_hourly_production.toLocaleString()} facturas/hora).`,
    `Con capacidad neta individual de ${baseline.net_monthly_capacity_per_resource.toLocaleString()} facturas/mes (ineficiencia ${(humanProfile.inefficiency_rate * 100).toFixed(1)}%), se requieren ${baseline.required_resources_rounded} funcionarios en esquema 100% humano (brecha actual: ${baseline.headcount_gap >= 0 ? `+${baseline.headcount_gap}` : baseline.headcount_gap}).`,
  ];

  if (mixResult?.feasible) {
    conclusions.push(
      `El mix óptimo Humano + Bot RPA requiere ${mixResult.optimal_humans} humano(s) y ${mixResult.optimal_bots} bot(s), con costo mensual de $${mixResult.total_monthly_cost.toLocaleString()} ($${mixResult.cost_per_invoice.toLocaleString()}/factura)${
        savings > 0 ? ` y un ahorro mensual de $${savings.toLocaleString()} frente a operación solo humana` : ""
      }.`
    );
  }

  if (pricingResult) {
    conclusions.push(
      `En la simulación comercial, el modelo de monetización recomendado es "${pricingResult.recommended_monetization}".`
    );
  }

  const recommendations: string[] = [];
  if (baseline.utilization_rate > 0.85) {
    recommendations.push(
      "La utilización proyectada supera el 85%: evitar sobrecargar el equipo para no incrementar glosas, devoluciones ni fatiga."
    );
  }
  if (processCfg.rework_return_rate > 0.05) {
    recommendations.push(
      `El retrabajo (${(processCfg.rework_return_rate * 100).toFixed(0)}%) consume capacidad crítica; implementar pre-auditoría y validación RIPS/CUV o FURIPS antes de radicar.`
    );
  }
  if (savings > 0 && mixResult && mixResult.optimal_bots > 0) {
    recommendations.push(
      `Priorizar automatización RPA para el ${((1 - botProfile.exception_escalation_rate) * 100).toFixed(0)}% de volumen estandarizable y reservar al equipo humano para excepciones y cuentas complejas.`
    );
  }
  if (marginal?.bottleneck_alert) {
    recommendations.push(marginal.bottleneck_alert);
  }
  if (recommendations.length === 0) {
    recommendations.push("Mantener monitoreo semanal de tiempos reales y recalibrar suplementos OIT ante cambios de portal EPS/ADRES.");
  }

  const handleDownloadMarkdown = () => {
    const md = [
      `# Informe Ejecutivo — Rendimientos Marginales en Facturación en Salud`,
      `Fecha: ${new Date().toLocaleString()}`,
      ``,
      `## 1. Modelo Construido`,
      `- **Proceso:** ${processCfg.name} (${processCfg.category} / ${processCfg.complexity})`,
      `- **Demanda mensual esperada:** ${processCfg.expected_monthly_demand.toLocaleString()} facturas`,
      `- **Retrabajo / Devolución:** ${(processCfg.rework_return_rate * 100).toFixed(1)}% (Demanda efectiva: ${baseline.effective_demand.toLocaleString()})`,
      `- **Tiempo promedio:** ${processCfg.avg_time_minutes} min/factura`,
      `- **Jornada humana:** ${humanProfile.available_hours_per_day} h/día × ${humanProfile.available_days_per_month} días · Ineficiencia: ${(humanProfile.inefficiency_rate * 100).toFixed(1)}%`,
      ``,
      `## 2. Conclusiones`,
      ...conclusions.map((c) => `- ${c}`),
      ``,
      `## 3. Recomendaciones`,
      ...recommendations.map((r) => `- ${r}`),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "informe_rendimientos_marginales.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm print:border-none print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Informe Ejecutivo de Capacidad, Rendimientos y Optimización
          </h2>
          <p className="text-xs text-slate-500">
            Generado automáticamente a partir de los modelos configurados · {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5" /> Descargar .MD
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-xs text-slate-500">Producción Óptima</div>
          <div className="mt-1 text-base font-bold text-slate-900">
            {baseline.optimal_daily_production.toLocaleString()} /día
          </div>
          <div className="text-[11px] text-slate-500">{baseline.optimal_hourly_production.toLocaleString()} /hora</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-xs text-slate-500">Solo Humanos</div>
          <div className="mt-1 text-base font-bold text-slate-900">{baseline.required_resources_rounded} personas</div>
          <div className="text-[11px] text-slate-500">${soloHumanCost.toLocaleString()}/mes</div>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3.5">
          <div className="text-xs text-indigo-700">Mix Óptimo H + Bot</div>
          <div className="mt-1 text-base font-bold text-indigo-900">
            {mixResult ? `${mixResult.optimal_humans}H + ${mixResult.optimal_bots}B` : "N/D"}
          </div>
          <div className="text-[11px] text-indigo-700">
            {mixResult ? `$${mixResult.total_monthly_cost.toLocaleString()}/mes` : ""}
          </div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3.5">
          <div className="text-xs text-emerald-700">Ahorro Potencial</div>
          <div className="mt-1 text-base font-bold text-emerald-900">
            ${Math.max(0, savings).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700">mensual</div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Conclusiones del Análisis</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
          {conclusions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Recomendaciones Operacionales</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
          {recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
