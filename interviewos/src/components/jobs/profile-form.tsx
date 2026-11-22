"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfileAction } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { type CareerProfile, JOB_LEVELS, WORK_MODES } from "@/lib/jobs/model";

export function ProfileForm({ initial }: { initial: CareerProfile }) {
  const { m } = useI18n();
  const P = m.jobs.profile;
  const router = useRouter();
  const [v, setV] = useState<CareerProfile>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof CareerProfile>(k: K, value: CareerProfile[K]) =>
    setV((s) => ({ ...s, [k]: value }));
  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveProfileAction(v);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(P.saved);
      router.refresh();
    });
  };

  const text = (
    key: "targetRoles" | "locations" | "availability" | "workAuthorization" | "languages" | "salary",
    label: string,
    placeholder?: string,
  ) => (
    <Field label={label} htmlFor={`pr-${key}`}>
      <Input
        id={`pr-${key}`}
        maxLength={500}
        placeholder={placeholder}
        value={v[key]}
        onChange={(e) => set(key, e.target.value)}
        data-testid={`profile-${key}`}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" data-testid="profile-form">
      <Field
        label={P.resume}
        htmlFor="pr-resume"
        hint={`${P.resumeHelp} · ${P.chars(v.resume.trim().length)}`}
      >
        <Textarea
          id="pr-resume"
          rows={18}
          maxLength={30_000}
          className="font-mono text-xs"
          value={v.resume}
          onChange={(e) => set("resume", e.target.value)}
          data-testid="profile-resume"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {text("targetRoles", P.targetRoles, m.jobs.find.rolesPlaceholder)}
        {text("locations", P.locations, m.jobs.find.locationsPlaceholder)}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-muted-foreground mb-1.5 text-xs font-medium">{P.workModes}</legend>
          <div className="flex flex-wrap gap-3">
            {WORK_MODES.map((w) => (
              <label key={w} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={v.workModes.includes(w)}
                  onChange={() => set("workModes", toggle(v.workModes, w))}
                />
                {m.jobs.workMode[w]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-muted-foreground mb-1.5 text-xs font-medium">{P.levels}</legend>
          <div className="flex flex-wrap gap-3">
            {JOB_LEVELS.map((l) => (
              <label key={l} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={v.levels.includes(l)}
                  onChange={() => set("levels", toggle(v.levels, l))}
                />
                {m.jobs.level[l]}
              </label>
            ))}
          </div>
        </fieldset>
        {text("availability", P.availability, P.availabilityPlaceholder)}
        {text("workAuthorization", P.workAuthorization, P.workAuthorizationPlaceholder)}
        {text("languages", P.languages, P.languagesPlaceholder)}
        {text("salary", P.salary)}
      </div>
      <Field label={P.preferences} htmlFor="pr-preferences">
        <Textarea
          id="pr-preferences"
          rows={3}
          maxLength={2000}
          placeholder={P.preferencesPlaceholder}
          value={v.preferences}
          onChange={(e) => set("preferences", e.target.value)}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        className="self-start"
        disabled={pending}
        data-testid="profile-save"
      >
        {P.save}
      </Button>
    </form>
  );
}
