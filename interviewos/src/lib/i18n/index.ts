import { common } from "./messages/common";
import { dashboard } from "./messages/dashboard";
import { interviews } from "./messages/interviews";
import { labs } from "./messages/labs";
import { learn } from "./messages/learn";
import { practice } from "./messages/practice";
import { review } from "./messages/review";
import type { Locale } from "./define";

/**
 * Feature message bundles. Each bundle is defined with `defineMessages`, which
 * enforces identical English and Russian shapes.
 */
const bundles = {
  common,
  dashboard,
  learn,
  practice,
  labs,
  review,
  interviews,
} as const;

type Bundles = typeof bundles;
export type Messages = { [K in keyof Bundles]: Bundles[K]["en"] };

export function getMessagesFor(locale: Locale): Messages {
  return Object.fromEntries(Object.entries(bundles).map(([k, v]) => [k, v[locale]])) as Messages;
}

export type { Locale };
export { LOCALES } from "./define";
