---
slug: accessibility
title: Web accessibility
path: ts-react
module: react-quality
order: 3
minutes: 40
depth: concise
practice: conceptual
summary: Semantic HTML first, keyboard navigation and focus management, labels and ARIA, colour contrast, and testing with tools and a screen reader.
prerequisites: []
problems: []
objectives:
  - Use semantic HTML and correct labels so assistive technologies understand the UI
  - Make interactive widgets keyboard-operable with visible focus and managed focus in dialogs
  - Apply ARIA only when HTML can't express the semantics, and test accessibility
readings:
  - title: "W3C — WCAG 2.2 at a glance"
    url: https://www.w3.org/WAI/standards-guidelines/wcag/glance/
    kind: docs
  - title: "W3C — ARIA Authoring Practices Guide"
    url: https://www.w3.org/WAI/ARIA/apg/
    kind: docs
  - title: "MDN — Accessibility"
    url: https://developer.mozilla.org/en-US/docs/Web/Accessibility
    kind: docs
interview:
  - q: "What's the first rule of ARIA?"
    a: "Don't use ARIA if a native HTML element or attribute provides the semantics and behaviour (use <button>, not <div role=button>). Wrong ARIA is worse than none. ARIA changes semantics only — you still implement keyboard behaviour."
  - q: "How do you make a modal dialog accessible?"
    a: "Use role=dialog with aria-modal and an accessible name (aria-labelledby), move focus into it on open, trap focus while open, close on Escape, make background inert, and return focus to the trigger on close. Libraries like Radix implement this."
selfAssessment:
  - I can make a custom widget keyboard accessible
  - I can explain WCAG contrast requirements
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A clickable <div onClick> instead of <button>:"
    options: ["Is equivalent", "Isn't focusable or keyboard-activatable and has no role by default", "Is more accessible", "Only fails in Safari"]
    answer: 1
    why: "Use <button>, which provides focus, Enter/Space activation and role."
  - q: "WCAG AA contrast for normal body text is at least:"
    options: ["2:1", "4.5:1", "7:1", "10:1"]
    answer: 1
    why: "3:1 for large text and UI component boundaries; 7:1 is AAA."
  - q: "An icon-only button needs:"
    options: ["Nothing", "An accessible name (aria-label or visually hidden text)", "A tooltip only", "role=img"]
    answer: 1
    why: "Screen readers otherwise announce just 'button'."
explain:
  prompt: "Explain how you'd make a custom dropdown/menu component accessible."
  rubric:
    - "Prefer native elements or a tested primitive library"
    - "Correct roles/states (button with aria-expanded, menu/listbox semantics)"
    - "Keyboard: open with Enter/Space/arrow, arrow navigation, Escape closes, focus return"
    - "Visible focus, labels, testing with keyboard and a screen reader"
  model: "First I'd check whether a native select or a tested primitive like Radix fits, because menus have complex keyboard behaviour. If I build it, the trigger is a real button with aria-haspopup and aria-expanded reflecting state, and the popup uses the menu or listbox pattern from the ARIA Authoring Practices with items having the matching roles. Keyboard support: Enter, Space or Arrow Down opens and focuses the first item, arrows move between items, Home and End jump, typing jumps to matching items, Escape closes and returns focus to the trigger. Focus must be visible, and the trigger needs an accessible name. I'd test with only the keyboard, with axe in automated tests, and with a screen reader such as VoiceOver or NVDA."
cards:
  - q: "First rule of ARIA"
    a: "Use native HTML semantics when possible; ARIA doesn't add behaviour."
  - q: "Accessible dialog checklist"
    a: "Name, focus moves in, trapped, Escape closes, focus returns to trigger, background inert."
---

## Explanation

- **Semantic HTML**: headings in order, landmarks (`header`, `nav`, `main`), lists, tables for tabular data, `button` vs `a` (actions vs navigation).
- **Labels**: every input has a `<label>`; icon buttons have `aria-label`; images have meaningful `alt` (empty for decorative).
- **Keyboard**: everything operable by keyboard, logical tab order, visible focus (`:focus-visible`), no keyboard traps except intentional modal traps.
- **ARIA**: roles/states (`aria-expanded`, `aria-selected`, `aria-live` for async updates) when HTML isn't enough.
- **Visual**: contrast ≥ 4.5:1 for text, don't rely on colour alone (InterviewOS shows status with text + colour), respect `prefers-reduced-motion`, support zoom to 200%.
- **Testing**: axe/Lighthouse automated checks (catch ~a third of issues), keyboard-only pass, screen reader smoke tests.

## Worked examples

```tsx
<button type="button" aria-label="Request a hint" onClick={requestHint}>
  <Lightbulb aria-hidden="true" />
</button>

<div role="status" aria-live="polite">{saving ? "Saving…" : "Saved"}</div>
```

## Common misconceptions

- **"Accessibility is only for blind users."** — It covers motor, cognitive, low-vision and situational needs.
- **"Adding ARIA makes it accessible."** — Incorrect ARIA can make it worse.
- **"Automated tools find everything."** — Many issues need manual testing.

## Practical exercises

1. Navigate InterviewOS (or one of your apps) using only the keyboard and list problems.
2. Run axe on a page and fix the top three issues.
