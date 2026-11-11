"use client";

import { EyeOff } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const InterviewModeContext = createContext<{ active: boolean; setActive: (v: boolean) => void }>({
  active: false,
  setActive: () => {},
});

export function useInterviewMode() {
  return useContext(InterviewModeContext);
}

/** Provides interview mode: while active, lesson content is hidden so explanations come from memory. */
export function LessonShell({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <InterviewModeContext.Provider value={{ active, setActive }}>{children}</InterviewModeContext.Provider>
  );
}

export function HideInInterviewMode({ children }: { children: React.ReactNode }) {
  const { active } = useInterviewMode();
  const { m } = useI18n();
  if (!active) return <>{children}</>;
  return (
    <div className="border-border text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm">
      <EyeOff className="size-4" />
      {m.learn.explain.hiddenNotice}
    </div>
  );
}
