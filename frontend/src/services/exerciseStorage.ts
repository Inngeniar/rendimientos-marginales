import type { ExerciseSnapshot, SavedExerciseRecord } from "../types/models";

const LOCAL_EXERCISES_KEY = "msm_saved_exercises_v1";
const SUPABASE_CFG_KEY = "msm_supabase_config_v1";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (envUrl && envKey) {
    return { url: envUrl.replace(/\/+$/, ""), anonKey: envKey };
  }
  try {
    const raw = localStorage.getItem(SUPABASE_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupabaseConfig;
      return { url: (parsed.url || "").replace(/\/+$/, ""), anonKey: parsed.anonKey || "" };
    }
  } catch {
    // ignore
  }
  return { url: "", anonKey: "" };
}

export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  localStorage.setItem(
    SUPABASE_CFG_KEY,
    JSON.stringify({ url: cfg.url.trim().replace(/\/+$/, ""), anonKey: cfg.anonKey.trim() })
  );
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

function loadLocalExercises(): SavedExerciseRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXERCISES_KEY);
    return raw ? (JSON.parse(raw) as SavedExerciseRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalExercises(items: SavedExerciseRecord[]): void {
  localStorage.setItem(LOCAL_EXERCISES_KEY, JSON.stringify(items));
}

export async function listExercises(): Promise<SavedExerciseRecord[]> {
  const cfg = getSupabaseConfig();
  if (cfg.url && cfg.anonKey) {
    const res = await fetch(`${cfg.url}/rest/v1/saved_exercises?select=*&order=created_at.desc`, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Error consultando Supabase (${res.status})`);
    }
    const rows = (await res.json()) as Array<Omit<SavedExerciseRecord, "source">>;
    return rows.map((r) => ({ ...r, source: "supabase" as const }));
  }
  return loadLocalExercises();
}

export async function saveExercise(snapshot: ExerciseSnapshot): Promise<SavedExerciseRecord> {
  const cfg = getSupabaseConfig();
  const payload = {
    name: snapshot.name,
    category: snapshot.processCfg.category,
    complexity: snapshot.processCfg.complexity,
    notes: snapshot.notes,
    model_payload: snapshot,
    summary_result: snapshot.summaryResult ?? {},
  };

  if (cfg.url && cfg.anonKey) {
    const res = await fetch(`${cfg.url}/rest/v1/saved_exercises`, {
      method: "POST",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Error guardando en Supabase (${res.status})`);
    }
    const rows = (await res.json()) as Array<Omit<SavedExerciseRecord, "source">>;
    return { ...rows[0], source: "supabase" };
  }

  const localItem: SavedExerciseRecord = {
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
    source: "local",
  };
  const existing = loadLocalExercises();
  saveLocalExercises([localItem, ...existing]);
  return localItem;
}

export async function deleteExercise(id: string, source: "supabase" | "local"): Promise<void> {
  if (source === "supabase") {
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      const res = await fetch(`${cfg.url}/rest/v1/saved_exercises?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Error eliminando en Supabase (${res.status})`);
      }
      return;
    }
  }
  const existing = loadLocalExercises().filter((x) => x.id !== id);
  saveLocalExercises(existing);
}

export function downloadSnapshotJson(snapshot: ExerciseSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = snapshot.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "_") || "modelo_facturacion";
  a.href = url;
  a.download = `${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseSnapshotJsonFile(file: File): Promise<ExerciseSnapshot> {
  const text = await file.text();
  const data = JSON.parse(text) as ExerciseSnapshot;
  if (!data.processCfg || !data.humanProfile || !data.botProfile) {
    throw new Error("El archivo JSON no contiene la estructura válida del modelo.");
  }
  return data;
}
