import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Server Components here are `async` functions, which a jsdom client render cannot run. This resolves
 * the top of an element tree by awaiting every ASYNC function component (and only those: a client
 * component with hooks is left for React to render), so the result can go to `render()`.
 */
export async function resolveServerElement(node: ReactNode): Promise<ReactNode> {
  let current: ReactNode = node;
  while (isValidElement(current) && typeof current.type === "function" && current.type.constructor.name === "AsyncFunction") {
    const element = current as ReactElement<Record<string, unknown>>;
    current = await (element.type as (props: Record<string, unknown>) => Promise<ReactNode>)(element.props);
  }
  if (isValidElement(current)) {
    const element = current as ReactElement<{ children?: ReactNode }>;
    const children = element.props.children;
    if (children !== undefined) {
      if (Array.isArray(children)) {
        const resolved = await Promise.all(children.map((child) => resolveServerElement(child)));
        return cloneElement(element, undefined, ...resolved);
      }
      return cloneElement(element, undefined, await resolveServerElement(children));
    }
  }
  return current;
}
