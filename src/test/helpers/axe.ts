import axe from "axe-core";

/** WCAG 2.0/2.1 A + AA — the conformance target of the public renderer. */
export const WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

/**
 * Runs axe-core against a rendered container in jsdom and returns the
 * violations (empty = clean). `color-contrast` is disabled: jsdom has no layout
 * or computed colour, so axe cannot evaluate it — contrast is covered by the
 * token-level sweeps in `src/test/lib/theme/contrast.controls.test.ts` instead.
 *
 * `region` is disabled too: it flags "content outside a landmark", which is
 * true by construction for a component rendered on its own, not a defect.
 */
export async function axeViolations({
  container,
  disabledRules = [],
}: {
  container: Element;
  disabledRules?: readonly string[];
}): Promise<axe.Result[]> {
  const rules: Record<string, { enabled: boolean }> = { "color-contrast": { enabled: false }, region: { enabled: false } };
  for (const id of disabledRules) rules[id] = { enabled: false };
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: [...WCAG_21_AA_TAGS] },
    rules,
  });
  return results.violations;
}

/** `rule: nodeTarget` lines, so a failing assertion names what to fix. */
export function describeViolations(violations: readonly axe.Result[]): string[] {
  return violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")} — ${violation.help}`));
}
