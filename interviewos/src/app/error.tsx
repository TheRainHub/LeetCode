"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";

/** Page-level error boundary: keeps the app shell (and its database warning) visible. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { m } = useI18n();
  const E = m.common.errorPage;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageContainer>
      <Card className="flex flex-col gap-3 p-6" data-testid="error-page">
        <h1 className="text-lg font-semibold">{E.title}</h1>
        {error.message ? (
          <pre className="bg-surface-2 text-muted-foreground max-h-48 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {error.message}
          </pre>
        ) : null}
        <p className="text-muted-foreground text-sm">{E.help}</p>
        <Button size="sm" variant="secondary" className="self-start" onClick={reset}>
          {E.retry}
        </Button>
      </Card>
    </PageContainer>
  );
}
