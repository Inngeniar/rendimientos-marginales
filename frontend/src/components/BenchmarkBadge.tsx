interface Props {
  status: string;
}

export function BenchmarkBadge({ status }: Props) {
  let color = "bg-slate-100 text-slate-700";
  if (status.startsWith("en_estandar")) color = "bg-emerald-100 text-emerald-800";
  else if (status.startsWith("por_debajo")) color = "bg-amber-100 text-amber-800";
  else if (status.startsWith("por_encima")) color = "bg-sky-100 text-sky-800";
  else if (status === "bot_rpa") color = "bg-violet-100 text-violet-800";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
