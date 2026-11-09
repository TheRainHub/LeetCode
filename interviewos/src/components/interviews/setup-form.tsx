"use client";

import { Play } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createInterviewAction } from "@/app/interviews/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { INTERVIEW_TYPES, type InterviewType } from "@/lib/ai/interviewer";
import { LANGUAGES, type Language } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";

export interface CompanyOption {
  slug: string;
  name: string;
  presets: { id: number; title: string; type: InterviewType; difficulty: "easy" | "medium" | "hard"; durationMinutes: number; language: Language }[];
}

export function SetupForm({
  companies,
  initial,
}: {
  companies: CompanyOption[];
  initial: { company: string; type: InterviewType; difficulty: "easy" | "medium" | "hard"; duration: number; language: Language };
}) {
  const { m } = useI18n();
  const S = m.interviews.setup;
  const [company, setCompany] = useState(initial.company);
  const [type, setType] = useState<InterviewType>(initial.type);
  const [difficulty, setDifficulty] = useState(initial.difficulty);
  const [duration, setDuration] = useState(initial.duration);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [pending, start] = useTransition();
  const presets = companies.find((c) => c.slug === company)?.presets ?? [];

  const submit = () =>
    start(async () => {
      const res = await createInterviewAction({ companySlug: company || null, type, difficulty, durationMinutes: duration, language });
      if (res && !res.ok) toast.error(res.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={S.company} htmlFor="iv-company">
          <Select id="iv-company" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">{S.general}</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={S.type} htmlFor="iv-type">
          <Select id="iv-type" value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {m.interviews.types[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={S.difficulty} htmlFor="iv-diff">
          <Select id="iv-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <option key={d} value={d}>
                {m.common.difficulty[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={S.duration} htmlFor="iv-duration">
          <Input id="iv-duration" type="number" min={10} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 45)} />
        </Field>
        <Field label={S.language} htmlFor="iv-lang">
          <Select id="iv-lang" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {m.common.languages[l]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {presets.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{S.presets}:</span>
          {presets.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant="outline"
              onClick={() => {
                setType(p.type);
                setDifficulty(p.difficulty);
                setDuration(p.durationMinutes);
                setLanguage(p.language);
              }}
            >
              {p.title}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={submit} disabled={pending} data-testid="start-interview">
          <Play />
          {pending ? S.starting : S.start}
        </Button>
        <span className="text-xs text-subtle-foreground">{S.english}</span>
      </div>
    </div>
  );
}
