"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setTopicPriorityAction, updateSettingsAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { Language } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";

export function SettingsForm({
  initial,
}: {
  initial: { locale: "en" | "ru"; theme: "dark" | "light"; preferredLanguage: Language; timezone: string; interviewerProfile: string };
}) {
  const { m } = useI18n();
  const S = m.settings;
  const [v, setV] = useState(initial);
  const [pending, run] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await updateSettingsAction(v);
          if (res.ok) toast.success(S.saved);
          else toast.error(res.error);
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={S.locale} htmlFor="s-locale">
          <Select id="s-locale" value={v.locale} onChange={(e) => setV({ ...v, locale: e.target.value as "en" | "ru" })} data-testid="locale-select">
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </Select>
        </Field>
        <Field label={S.theme} htmlFor="s-theme">
          <Select id="s-theme" value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value as "dark" | "light" })}>
            <option value="dark">{S.themes.dark}</option>
            <option value="light">{S.themes.light}</option>
          </Select>
        </Field>
        <Field label={S.preferredLanguage} htmlFor="s-lang">
          <Select id="s-lang" value={v.preferredLanguage} onChange={(e) => setV({ ...v, preferredLanguage: e.target.value as Language })}>
            {(["java", "typescript", "python"] as const).map((l) => (
              <option key={l} value={l}>
                {m.common.languages[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={S.timezone} htmlFor="s-tz">
          <Input id="s-tz" value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} />
        </Field>
      </div>
      <Field label={S.profile} htmlFor="s-profile" hint={S.profileHelp}>
        <Textarea id="s-profile" rows={8} value={v.interviewerProfile} onChange={(e) => setV({ ...v, interviewerProfile: e.target.value })} />
      </Field>
      <Button type="submit" variant="primary" className="self-start" disabled={pending} data-testid="save-settings">
        {S.save}
      </Button>
    </form>
  );
}

export function PrioritySelect({ topicId, value }: { topicId: number; value: number }) {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <Select
      className="h-7 w-28 text-xs"
      value={value}
      disabled={pending}
      aria-label={m.common.labels.priority}
      onChange={(e) =>
        run(async () => {
          const res = await setTopicPriorityAction({ topicId, priority: Number(e.target.value) });
          if (!res.ok) toast.error(res.error);
        })
      }
    >
      {[2, 1, 0, -1].map((p) => (
        <option key={p} value={p}>
          {m.common.priorityLabels[String(p)]}
        </option>
      ))}
    </Select>
  );
}
