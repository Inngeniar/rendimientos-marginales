# ARCHITECTURE.md — Calculadora y Analizador de Rendimientos Marginales en Facturación en Salud

## 1. Visión General
Aplicación web desacoplada para modelar, simular y optimizar la producción, productividad, dotación (humana y RPA/bots) y rendimientos marginales de los procesos operacionales de facturación en servicios de salud:
1. **Liquidación de facturas** (Cirugía/Hospitalización, Urgencias, Consulta Externa, Laboratorio, Imagenología, Hemodiálisis, APS, Vacunas, etc.).
2. **Auditoría de cuentas médicas** (Pre-auditoría, auditoría concurrente/retrospectiva, pertinencia y soportes).
3. **Radicación de facturas** (Digital/Ventanilla virtual, RIPS JSON/XML + CUV, radicación física y gestión de devoluciones/glosas).

---

## 2. Estructura de Directorios

```text
Rendimientos Marginales/
├── ARCHITECTURE.md
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                  # Punto de entrada FastAPI + CORS
│   │   ├── config.py                # Configuración general y parámetros por defecto
│   │   ├── db/
│   │   │   ├── database.py          # Conexión SQLite / SQLAlchemy
│   │   │   └── models.py            # Tablas ORM (Escenarios, Procesos, Historicos, Estandares)
│   │   ├── schemas/
│   │   │   ├── process.py           # Modelos Pydantic de entrada/salida por proceso
│   │   │   ├── resource.py          # Perfiles de recurso (Humano vs. Bot/RPA)
│   │   │   └── simulation.py        # Contratos de simulación, optimización y rendimientos marginales
│   │   ├── engine/
│   │   │   ├── baseline.py          # Cálculo lineal determinístico (compatible con Excel actual)
│   │   │   ├── marginal.py          # Curvas de rendimiento marginal (fatiga, congestión, aprendizaje)
│   │   │   ├── optimizer.py         # Optimización mixta Humano + Bot (SciPy MILP / NLP)
│   │   │   ├── pipeline.py          # Flujo encadenado Liquidación -> Auditoría -> Radicación + Devoluciones
│   │   │   └── benchmarks.py        # Catálogo de estándares sectoriales de referencia
│   │   ├── services/
│   │   │   ├── excel_io.py          # Importación/Exportación compatible con plantillas .xlsx
│   │   │   └── scenario_service.py  # CRUD de escenarios y análisis comparativo
│   │   └── api/
│   │       └── routes/
│   │           ├── simulation.py    # Endpoints de cálculo, curvas marginales y optimización
│   │           ├── benchmarks.py    # Consulta y personalización de estándares
│   │           ├── scenarios.py     # Guardado/comparación de escenarios
│   │           └── excel.py         # Carga y descarga de archivos Excel
│   └── tests/
│       ├── test_baseline.py
│       ├── test_marginal.py
│       ├── test_optimizer.py
│       └── test_excel_io.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api/                     # Cliente tipado hacia FastAPI
        ├── types/                   # Interfaces TypeScript espejo de schemas Pydantic
        ├── components/
        │   ├── ProcessForm.tsx      # Parámetros de proceso, tiempos, días e ineficiencia
        │   ├── ResourceMixPanel.tsx # Configuración de Humanos vs. Bots/RPA y costos
        │   ├── MarginalChart.tsx    # Curva Producto Total, Medio y Marginal (Recharts)
        │   ├── PipelineView.tsx     # Cuellos de botella entre Liquidación, Auditoría y Radicación
        │   └── BenchmarkBadge.tsx   # Semáforo contra estándares del sector
        └── pages/
            ├── SimulatorPage.tsx
            ├── OptimizerPage.tsx
            └── ScenariosPage.tsx
```

---

## 3. Modelos de Datos (Contratos Principales)

### 3.1. Proceso Operacional (`ProcessConfig`)
- `id`: `string`
- `name`: `string` (ej. `"Cirugía - Hospitalización"`, `"Consulta Externa"`, `"Auditoría Alta Complejidad"`, `"Radicación Digital"`)
- `category`: `"liquidacion" | "auditoria" | "radicacion" | "devoluciones"`
- `complexity`: `"baja" | "media" | "alta"`
- `expected_monthly_demand`: `float` (facturas/cuentas objetivo del mes)
- `avg_time_minutes`: `float` (tiempo estándar por factura/cuenta)
- `working_days_per_month`: `int` (días hábiles o ventana efectiva de cierre)
- `effective_hours_per_day`: `float` (jornada efectiva descontando pausas/reuniones)
- `base_inefficiency_rate`: `float` (`0.0 - 0.99`, factores limitantes base)
- `rework_return_rate`: `float` (`0.0 - 0.50`, % de facturas devueltas/glosadas que reingresan al flujo)
- `sla_deadline_days`: `int | null` (ventana máxima de radicación/cierre, ej. primeros 5 días hábiles)

### 3.2. Perfil de Recurso (`ResourceProfile`)
- `resource_type`: `"human" | "bot"`
- `name`: `string`
- `available_hours_per_day`: `float` (ej. `8.0` humano, `12.0–24.0` bot)
- `available_days_per_month`: `int` (ej. `20–22` humano, `30` bot)
- `speed_multiplier`: `float` (ej. `1.0` humano estándar, `1.5–4.0` bot en radicación/pre-auditoría)
- `inefficiency_rate`: `float` (ej. `0.10` humano, `0.03` bot)
- `exception_escalation_rate`: `float` (`0.0` humano; `0.05–0.25` bot para casos no estructurados que escalan a humano)
- `fatigue_exponent`: `float` (penalización marginal por horas extra o sobrecarga en humanos)
- `learning_curve_factor`: `float` (`0.6 - 1.0` según antigüedad del operador)
- `monthly_cost`: `float` (salario + prestaciones o licencia/mantenimiento mensual del bot)
- `current_headcount`: `int` (dotación actual para análisis de brecha)

### 3.3. Salida de Simulación (`SimulationResult`)
- `optimal_daily_production`: `float` (facturas/día óptimas)
- `optimal_hourly_production`: `float` (facturas/hora óptimas)
- `effective_capacity_per_resource_month`: `float`
- `required_humans`: `float` (exacto y redondeado al techo operativo)
- `required_bots`: `float`
- `headcount_gap`: `float` (`requerido - actual`)
- `utilization_rate`: `float` (`%` de ocupación; alerta si `> 85%` por riesgo de cola/estrés)
- `marginal_curve`: `list[{ staff_count, total_output, average_output, marginal_output, unit_cost }]`
- `bottleneck_alert`: `string | null`

---

## 4. Endpoints / Contratos API (FastAPI)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/simulate/baseline` | Reproduce y valida el cálculo determinístico del modelo Excel base. |
| `POST` | `/api/v1/simulate/marginal` | Calcula curvas de producto total ($PT$), medio ($PMe$) y marginal ($PMg$) variando dotación y horas. |
| `POST` | `/api/v1/optimize/mix` | Resuelve la combinación óptima Humano + Bot minimizando costo total o maximizando cumplimiento de SLA. |
| `POST` | `/api/v1/simulate/pipeline` | Evalúa el flujo completo Liquidación $\to$ Auditoría $\to$ Radicación + Devoluciones detectando cuellos de botella. |
| `GET` | `/api/v1/benchmarks` | Retorna estándares aceptados del sector por proceso y complejidad. |
| `POST` | `/api/v1/excel/import` | Importa un archivo `.xlsx` con la estructura actual y lo convierte a escenarios editables. |
| `POST` | `/api/v1/excel/export` | Exporta resultados y curvas marginales a `.xlsx` formateado. |
| `GET/POST` | `/api/v1/scenarios` | Lista, guarda y compara escenarios guardados en SQLite. |

---

## 5. Dependencias Clave

- **Backend (Python 3.11+):** `fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `numpy`, `scipy` (optimización `linprog` / `minimize`), `pandas`, `openpyxl`, `sqlalchemy`, `pytest`, `httpx`.
- **Frontend (Node 20+):** `react`, `typescript`, `vite`, `tailwindcss`, `recharts`, `lucide-react`, `axios`.

---

## 6. Motores de IA Recomendados por Etapa de Desarrollo

| Etapa | Motor / Modelo IA | Justificación Técnica |
| :--- | :--- | :--- |
| **Fase 1: Arquitectura, Modelado Matemático e Investigación** | **Gemini 4 Carbon / Argon** | Máxima capacidad de razonamiento para diseñar modelos de rendimientos marginales, teoría de colas, restricciones MILP y contratos de datos sin deuda técnica. |
| **Fase 2: Implementación Backend (Motor, API, Excel IO) y Pruebas Unitarias** | **Gemini 4 Hydrogen (Medium)** | Equilibrio óptimo entre velocidad, precisión en Python/FastAPI/SciPy y bajo consumo de cuota para desarrollo iterativo módulo por módulo. |
| **Fase 3: Implementación Frontend (React, Gráficas Marginales, UX)** | **Gemini 4 Hydrogen (Medium)** | Generación limpia de componentes TypeScript/Recharts y conexión con contratos Pydantic ya validados. |
| **Fase 4: Pruebas de Integración, Refinamiento y Documentación** | **Gemini 4 Hydrogen (Medium)** (o **Flash** para tareas repetitivas de fixtures/docs) | Validación rápida de casos borde, regresión contra los Excel base y generación de guías de usuario. |
| **Fase Opcional (Producción): Copiloto Analítico en la App** | **Gemini Flash / API** | Si la app incorpora un asistente en lenguaje natural para explicar cuellos de botella o sugerir redistribución de personal, usar un modelo rápido y económico sobre JSON estructurado. |
