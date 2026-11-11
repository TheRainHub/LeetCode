// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithI18n } from "@/test/render";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the localized label and exposes the status", () => {
    renderWithI18n(<StatusBadge status="needs_review" withHelp={false} />);
    const badge = screen.getByText("Needs review");
    expect(badge.closest("[data-status]")).toHaveAttribute("data-status", "needs_review");
  });

  it("uses Russian labels when the locale is ru", () => {
    renderWithI18n(<StatusBadge status="interview_ready" withHelp={false} />, { locale: "ru" });
    expect(screen.getByText("Готово к собеседованию")).toBeInTheDocument();
  });
});
