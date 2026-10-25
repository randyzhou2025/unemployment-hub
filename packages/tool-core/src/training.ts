import type {
  TrainingCatalog,
  TrainingProject,
  TrainingGrade,
} from "@uh/contracts";
export function trainingCurrent(
  c: TrainingCatalog,
  today = new Date().toISOString().slice(0, 10),
) {
  return (
    c.enabled &&
    c.effectiveFrom <= today &&
    today <= c.effectiveTo &&
    today <= c.reviewDueAt
  );
}
export function trainingReference(
  c: TrainingCatalog,
  p: TrainingProject,
  level: TrainingGrade,
  contextId: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const context = c.contexts.find((v) => v.id === contextId);
  if (
    !trainingCurrent(c, today) ||
    !p.enabled ||
    !p.levels.some((v) => v.key === level) ||
    context?.ratioBps == null
  )
    return null;
  return Math.round(
    (c.rates[p.subsidyClass][level] * context.ratioBps) / 10000,
  );
}
export function filterTraining(
  projects: TrainingProject[],
  query = "",
  category = "all",
  personalOnly = false,
) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return projects.filter(
    (p) =>
      p.enabled &&
      (category === "all" || category === p.category) &&
      (!personalOnly ||
        p.levels.some((l) => l.registrationMode === "personal")) &&
      words.every((w) =>
        `${p.title} ${p.fullName} ${p.summary}`.toLocaleLowerCase().includes(w),
      ),
  );
}
