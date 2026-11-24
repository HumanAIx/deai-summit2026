import { render as rtlRender } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Ticket components call `useTranslations` from `@/lib/tickets/i18n`, a real English implementation that needs
 * no provider, so this is plain RTL `render`. Kept as a module so tests import from one place.
 */
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options);
}

export * from "@testing-library/react";
