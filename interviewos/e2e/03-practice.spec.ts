import { expect, test } from "./fixtures";

const SOLUTION = `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}`;

test("TypeScript solution runs in the browser worker and the attempt is recorded with a complexity review", async ({ page }) => {
  await page.goto("/practice/problems/two-sum");
  await page.getByTestId("language-select").selectOption("typescript");
  // Type into the mounted editor (not just the model) so the app's change handler sees the code.
  type EditorWindow = { monaco?: { editor: { getEditors(): { getModel(): { uri: { path: string } } | null; setValue(v: string): void; getValue(): string }[] } } };
  await page.waitForFunction(() => {
    const ed = (window as unknown as EditorWindow).monaco?.editor.getEditors()[0];
    return Boolean(ed?.getModel()?.uri.path.endsWith(".ts"));
  });
  // Right after a language switch Monaco's change subscription can still point at the previous
  // language for a frame, so set the code until the app's own TypeScript draft contains it.
  await expect(async () => {
    await page.evaluate((code) => (window as unknown as EditorWindow).monaco!.editor.getEditors()[0]!.setValue(code), SOLUTION);
    const draft = await page.evaluate(() => window.localStorage.getItem("interviewos:draft:two-sum:typescript"));
    expect(draft).toContain("seen.get");
  }).toPass({ timeout: 10_000 });

  await page.getByTestId("run-tests").click();
  const results = page.getByTestId("results-panel");
  await expect(results.getByText(/^(\d+) \/ \1 passed$/)).toBeVisible();
  await expect(results.getByText(/Executed in your browser/)).toBeVisible();

  await page.getByTestId("submit-attempt").click();
  await page.locator("#claim-time").selectOption("O(n)");
  await page.locator("#claim-space").selectOption("O(n)");
  await page.getByTestId("record-attempt").click();
  await expect(page.getByTestId("attempt-review")).toBeVisible();
});
