/**
 * Page tests run in the `server` vitest project (the `react-server` resolve condition), whose React cannot
 * be paired with the client JSX runtime the test environment loads. A page here is asserted by the element
 * it returns (which component, with which props), so JSX is replaced by plain `{ type, props, key }`
 * objects. Use as
 * `vi.mock("react/jsx-dev-runtime", async () => (await import("<rel>/helpers/jsx-stub")).jsxStub)` (and the
 * same for `react/jsx-runtime`).
 */
function element(type: unknown, props: unknown, key?: unknown) {
  return { type, props, key: key ?? null };
}

export const jsxStub = {
  Fragment: Symbol.for("react.fragment"),
  jsx: element,
  jsxs: element,
  jsxDEV: element,
};
