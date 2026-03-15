"use client";

export const IMPACT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  build_student_knowledge: { label: "Student Knowledge", color: "bg-blue-500", bg: "bg-blue-100" },
  improve_attainment: { label: "Attainment", color: "bg-emerald-500", bg: "bg-emerald-100" },
  improve_teaching_efficiency: { label: "Teaching Efficiency", color: "bg-violet-500", bg: "bg-violet-100" },
  reduce_teacher_workload: { label: "Workload Reduction", color: "bg-amber-500", bg: "bg-amber-100" },
  improve_teacher_knowledge: { label: "Teacher Knowledge", color: "bg-rose-500", bg: "bg-rose-100" },
};

export function ImpactBars({ data }: { data: Record<string, unknown> }) {
  const scores = Object.entries(IMPACT_LABELS)
    .map(([key, meta]) => ({
      key,
      ...meta,
      value: data[key] != null && data[key] !== "" ? Number(data[key]) : null,
    }))
    .filter((s) => s.value !== null && !isNaN(s.value as number));

  if (scores.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Educational Impact</span>
        {data.product_id ? <span className="text-[10px] text-slate-400 ml-auto">{String(data.product_id)}</span> : null}
      </div>
      {scores.map((s) => (
        <div key={s.key} className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 w-[120px] shrink-0 text-right">{s.label}</span>
          <div className={`flex-1 h-5 ${s.bg} rounded-full overflow-hidden relative`}>
            <div
              className={`h-full ${s.color} rounded-full transition-all duration-700 ease-out-expo relative`}
              style={{ width: `${s.value}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 w-10 text-right">{s.value}%</span>
        </div>
      ))}
    </div>
  );
}
