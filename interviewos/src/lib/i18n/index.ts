import { analytics } from "./messages/analytics";
import { bank } from "./messages/bank";
import { common } from "./messages/common";
import { companiesMsg } from "./messages/companies";
import { dashboard } from "./messages/dashboard";
import { experience } from "./messages/experience";
import { interviews } from "./messages/interviews";
import { knowledge } from "./messages/knowledge";
import { labs } from "./messages/labs";
import { learn } from "./messages/learn";
import { practice } from "./messages/practice";
import { review } from "./messages/review";
import { schedule } from "./messages/schedule";
import { sd } from "./messages/sd";
import { settings } from "./messages/settings";
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
  bank,
  sd,
  labs,
  review,
  interviews,
  schedule,
  companies: companiesMsg,
  experience,
  analytics,
  settings,
  knowledge,
} as const;

type Bundles = typeof bundles;
export type Messages = { [K in keyof Bundles]: Bundles[K]["en"] };

export function getMessagesFor(locale: Locale): Messages {
  return Object.fromEntries(Object.entries(bundles).map(([k, v]) => [k, v[locale]])) as Messages;
}

export type { Locale };
export { LOCALES } from "./define";
