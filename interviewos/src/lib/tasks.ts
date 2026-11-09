export type TaskKind = "lesson" | "problem" | "review" | "lab" | "mock" | "experience" | "custom";

/** Where a study task takes the user. */
export function taskHref(kind: TaskKind, refSlug: string | null | undefined): string {
  switch (kind) {
    case "lesson":
      return refSlug ? `/learn/lesson/${refSlug}` : "/learn";
    case "problem":
      return refSlug ? `/practice/problems/${refSlug}` : "/practice";
    case "lab":
      return refSlug ? `/practice/labs/${refSlug}` : "/practice?tab=labs";
    case "review":
      return "/practice/review";
    case "mock":
      return "/interviews/new";
    case "experience":
      return "/experience";
    case "custom":
      return "/schedule";
  }
}
