import { BookOpen, Calculator, ExternalLink, GitBranch, Scale, ShieldCheck } from "lucide-react";

const CONCEPTS = [
  {
    title: "1. Ley de los Rendimientos Marginales Decrecientes",
    badge: "Microeconomía de la Producción",
    formula: "PT(n) = Cap_neta × n / [1 + α·(n - 1)]   |   PMg(n) = PT(n) - PT(n - 1)",
    plain:
      "En facturación en salud, duplicar el personal no siempre duplica las facturas radicadas. Cuando varias personas comparten el mismo HIS, las mismas ventanillas EPS o dependen de los mismos auditores, aparece fricción de coordinación y esperas (factor α). Cada persona adicional aporta menos facturas nuevas (Producto Marginal) que la anterior.",
    decision:
      "Sirve para detectar el punto exacto donde contratar más gente se vuelve costoso y poco efectivo, justificando reorganizar células o automatizar con RPA.",
  },
  {
    title: "2. Producto Total (PT), Medio (PMe) y Marginal (PMg)",
    badge: "Indicadores de Escala",
    formula: "PMe(n) = PT(n) / n   |   Costo Unitario = (n × Costo Mensual) / min(PT, Demanda)",
    plain:
      "El Producto Total es el volumen completo que saca el equipo; el Producto Medio es el promedio por persona; y el Producto Marginal mide cuántas facturas adicionales suma exactamente la última persona incorporada. Si agregas personal más allá de la demanda efectiva, el costo por factura sube sin generar más radicación.",
    decision:
      "Permite equilibrar cobertura de demanda y costo unitario mínimo por factura.",
  },
  {
    title: "3. Suplementos de Tiempo e Ineficiencia Operativa (OIT)",
    badge: "Ingeniería del Trabajo",
    formula: "Ineficiencia = S / (100 + S), donde S = %Personal + %Fatiga + %CargaMental + %Contingencias",
    plain:
      "Ningún operador produce el 100% de los 480 minutos de una jornada de 8 horas. Siguiendo la metodología de Estudio del Trabajo de la OIT, se descuentan suplementos por necesidades personales, fatiga básica, carga visual/mental frente a pantalla y contingencias propias del entorno (caídas de portales EPS, lentitud del HIS).",
    decision:
      "Evita dimensionar equipos con metas irreales de 100% de ocupación teórica.",
  },
  {
    title: "4. Fatiga por Jornada Extendida y Curva de Aprendizaje",
    badge: "Factor Humano",
    formula: "Fatiga = 1 / [1 + β · ((h - 8) / 8)^1.5]   (para h > 8 h/día)",
    plain:
      "Cuando la jornada humana supera las 8 horas efectivas, el cansancio reduce el ritmo y aumenta la probabilidad de error/glosa de forma no lineal (exponente 1.5). Adicionalmente, el factor de curva de aprendizaje (0.60 a 1.00) ajusta la productividad real según la experiencia del operador en el proceso.",
    decision:
      "Demuestra cuándo las horas extra salen más caras que incorporar un recurso de apoyo o un bot.",
  },
  {
    title: "5. Demanda Efectiva por Reprocesos y Devoluciones",
    badge: "Calidad / Clean Claim Rate",
    formula: "Demanda Efectiva = Demanda Base × (1 + Tasa de Devolución)",
    plain:
      "Cada factura devuelta o glosada por falta de soportes, inconsistencias RIPS o errores de liquidación vuelve a entrar a la fila de trabajo. Una tasa de devolución del 10% significa que el equipo debe procesar 110 cuentas por cada 100 facturas nuevas del mes.",
    decision:
      "Cuantifica cuánta capacidad operativa se recupera al mejorar la calidad en el primer envío (Clean Claim Rate).",
  },
  {
    title: "6. Teoría de Colas y Umbral Crítico de Utilización (85%)",
    badge: "Gestión de Flujo y SLA",
    formula: "Utilización (ρ) = Demanda Efectiva / Capacidad Total   (Alerta si ρ > 85%)",
    plain:
      "En sistemas con variabilidad de llegadas y tiempos de atención (como urgencias o cierres de radicación), operar por encima del 85% de ocupación provoca que las colas crezcan exponencialmente. Aunque en papel 'alcance', cualquier pico o incapacidad genera retrasos y vencimiento de SLA.",
    decision:
      "Mantiene un margen operativo sano del 15% para absorber picos de cierre sin incumplir ventanas EPS/ADRES.",
  },
  {
    title: "7. Optimización Mixta Humano + Bot RPA",
    badge: "Investigación de Operaciones",
    formula: "Min Costo(H, B) sujeto a: B·Cap_bot ≤ D·(1 - Escalamiento)  y  B·Cap_bot + H·Cap_hum ≥ D",
    plain:
      "Los bots RPA operan más horas al día (12–24 h) y más días al mes (30 días) sin fatiga, pero solo pueden resolver casos estructurados. Las excepciones clínicas o documentales (tasa de escalamiento) deben pasar obligatoriamente a criterio humano. El modelo busca la combinación entera exacta (Humanos, Bots) de menor costo total.",
    decision:
      "Sustenta con cifras el retorno de inversión de automatizar radicación, armado o pre-auditoría.",
  },
  {
    title: "8. Flujo Encadenado y Cuellos de Botella (TOC)",
    badge: "Teoría de Restricciones",
    formula: "Capacidad del Flujo = min(Capacidad_Liquidación, Armado, Auditoría, Radicación)",
    plain:
      "La facturación en salud funciona como una cadena secuencial: Liquidación → Armado de Cuentas → Auditoría → Radicación. De nada sirve acelerar Liquidación si Auditoría o Radicación no tienen capacidad para absorber el volumen; el inventario simplemente se represa antes del eslabón más lento.",
    decision:
      "Identifica en qué etapa exacta invertir recursos para destrabar toda la cadena de ingresos.",
  },
];

const SOURCES = [
  {
    category: "Ingeniería del Trabajo y Ergonomía",
    title: "Introducción al Estudio del Trabajo (4.ª edición)",
    author: "Organización Internacional del Trabajo (OIT) — George Kanawaty",
    usage: "Base metodológica para tiempos estándar, suplementos por necesidades personales, fatiga básica, carga mental y contingencias (fórmula S / (100 + S)).",
  },
  {
    category: "Microeconomía y Teoría de la Producción",
    title: "Microeconomía Intermedia / Microeconomía",
    author: "Hal R. Varian · Robert S. Pindyck & Daniel L. Rubinfeld",
    usage: "Fundamento de las curvas de Producto Total (PT), Producto Medio (PMe), Producto Marginal (PMg), costos unitarios y Ley de Rendimientos Marginales Decrecientes.",
  },
  {
    category: "Investigación de Operaciones y Teoría de Colas",
    title: "Introducción a la Investigación de Operaciones",
    author: "Frederick S. Hillier & Gerald J. Lieberman",
    usage: "Modelado de saturación por colas (umbral recomendado ≤ 85% de utilización) y formulación entera del optimizador mixto Humano + Bot RPA.",
  },
  {
    category: "Gestión de Flujos y Cuellos de Botella",
    title: "La Meta: Un proceso de mejora continua (Teoría de Restricciones - TOC)",
    author: "Eliyahu M. Goldratt",
    usage: "Evaluación del flujo encadenado Liquidación → Armado de Cuentas → Auditoría → Radicación y detección de la etapa restricción.",
  },
  {
    category: "Normativa Colombiana — Soportes, Glosas y Devoluciones (Vigente)",
    title: "Resolución 2284 de 2023 (modificada por Res. 627 y 1885 de 2024)",
    author: "Ministerio de Salud y Protección Social (Colombia)",
    usage: "Norma vigente que establece los soportes obligatorios de cobro, su tipificación, los plazos de radicación y el Manual Único de Devoluciones, Glosas y Respuestas (5 días devolución / 20 días glosa / 15 días respuesta) aplicadas al cálculo de reprocesos.",
  },
  {
    category: "Normativa Colombiana — RIPS Electrónico y CUV (Vigente)",
    title: "Resolución 948 de 2026 (derogó la Res. 2275 de 2023)",
    author: "Ministerio de Salud y Protección Social (Colombia)",
    usage: "Norma vigente (14 de mayo de 2026) que reglamenta el RIPS en formato JSON como soporte de la Factura Electrónica de Venta en salud (FEV) y el Código Único de Validación (CUV), derogando expresamente la Res. 2275 de 2023 y sus modificatorias (Res. 558 y 1884 de 2024).",
  },
  {
    category: "Normativa SOAT - ADRES",
    title: "Decreto 780 de 2016, Manual Tarifario SOAT y Anexos FURIPS 1/2",
    author: "Ministerio de Salud / ADRES",
    usage: "Tiempos y estándares diferenciados para liquidación, armado de cuentas, agotamiento de póliza SOAT y reclamaciones ante ADRES.",
  },
  {
    category: "Calibración Operativa Interna",
    title: "Herramientas base de Rendimientos Marginales (Plantillas Excel MSM)",
    author: "Mundo Salud Médica — Datos operativos de facturación",
    usage: "Calibración de tiempos por proceso, demanda mensual de referencia y compatibilidad de importación/exportación .xlsx.",
  },
];

export function TheoryAndSources() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Marco Teórico, Fórmulas y Fuentes Consultadas
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Esta sección explica en lenguaje claro los modelos microeconómicos, de ingeniería del trabajo, investigación
              de operaciones y normativa colombiana en salud que sustentan cada cálculo de la aplicación.
            </p>
          </div>
        </div>
      </div>

      {/* Conceptos teóricos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CONCEPTS.map((c) => (
          <div
            key={c.title}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <Calculator className="h-3 w-3" />
                  {c.badge}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
              <div className="mt-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] text-indigo-200">
                {c.formula}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">{c.plain}</p>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900">
              <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                <strong>Aplicación práctica:</strong> {c.decision}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual de Usuario y Metodología de Monetización */}
      <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Manual de Usuario: Metodología de Rangos y Modelos de Monetización
          </h3>
          <p className="text-xs text-slate-500">
            Fórmulas transparentes de ingreso, margen bruto y aceptación dinámica de mercado
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700">
            <h4 className="mb-2 font-bold text-slate-900">1. Cálculo del Ingreso Mensual por Modelo</h4>
            <p className="mb-2">
              Sea <code>C_op</code> el costo operativo del mix óptimo (Humanos + Bots), <code>Q_eff</code> la demanda
              efectiva (incluyendo retrabajo) y <code>m</code> el margen objetivo (ej. 30%). El ingreso base objetivo
              es <code>I_base = C_op / (1 - m)</code>:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong>Tarifa Fija por Factura:</strong> <code>I = I_base</code> (precio unitario exacto para lograr el
                margen <code>m</code>).
              </li>
              <li>
                <strong>Suscripción por Rango (Paquete):</strong> <code>I = I_base × 1.05</code> (prima del +5% por
                garantizar presupuesto plano dentro del rango).
              </li>
              <li>
                <strong>Híbrido (Base Fija + Variable):</strong> <code>I = 0.75 × C_op + 0.52 × I_base</code> (cubre
                costos fijos/RPA + tarifa variable escalonada).
              </li>
              <li>
                <strong>% sobre Valor Facturado / Recaudo:</strong>{" "}
                <code>I = Q_eff × Valor_Factura × %Comisión</code>.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700">
            <h4 className="mb-2 font-bold text-slate-900">2. Margen Bruto, Aceptación Dinámica y Decisión</h4>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>
                <strong>Margen Bruto (%):</strong> <code>(Ingreso - C_op) / Ingreso × 100</code>.
              </li>
              <li>
                <strong>Aceptación Dinámica (0–100):</strong> Parte de la aceptación base según complejidad (ej. 90 en
                Híbrido, 88/74 en Tarifa Fija, 92/70 en % Recaudo) y <strong>penaliza automáticamente</strong> si el
                cobro unitario excede <code>2.5×</code> el precio objetivo o supera el <code>5%</code> del valor
                promedio de la factura.
              </li>
              <li>
                <strong>Selección del Óptimo:</strong> Combina <code>Rentabilidad</code> y <code>Aceptación</code>{" "}
                según tu deslizador de prioridad, aplicando penalización comercial (-20 pts) a modelos por debajo de la{" "}
                <em>aceptación mínima exigida</em>.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fuentes consultadas */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Fuentes Bibliográficas, Técnicas y Normativas Consultadas
            </h3>
            <p className="text-xs text-slate-500">
              Referencias metodológicas y regulatorias utilizadas en el diseño del motor de cálculo y estándares
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SOURCES.map((s) => (
            <div
              key={s.title}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                  {s.category}
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span>{s.title}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </div>
              <div className="text-[11px] font-medium text-slate-600">{s.author}</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{s.usage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
