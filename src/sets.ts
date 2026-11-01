/**
 * Zatvoreni skupovi vrijednosti jezgre kampanje.
 *
 * U D1 nema ENUM tipa: svaki skup postaje `TEXT` + `CHECK (x IN (…))`, a promjena
 * skupa traži migraciju koja prepisuje tablicu. Zato su skupovi ovdje zatvoreni i
 * mijenjaju se samo odlukom upisanom u energy `docs/19` §6.
 *
 * Redoslijed u nizu je redoslijed prikaza, ne značenje.
 */

/**
 * Vrsta kampanje (energy docs/19 §6.3).
 *
 * `membership` = članski ulog (energy `community`), `reward` = pinka `crowdfund`
 * (sponzorstvo s nagradama). Pinkine `tokenization` i `realestate` NISU ovdje i
 * ne smiju biti: to je ECSP/MiFID teritorij (energy docs/03 §3, docs/14 §2.4).
 * `CHECK` u D1 je tada kontrola usklađenosti, ne kozmetika.
 */
export const CAMPAIGN_TYPES = ["donation", "membership", "reward", "tickets"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

/**
 * Vrijednosti koje postoje u pinka_finance, a jezgra ih odbija. Mapper ih ne
 * smije tiho prevesti u nešto dopušteno.
 */
export const REJECTED_PINKA_CAMPAIGN_TYPES = ["tokenization", "realestate"] as const;
export const REJECTED_PINKA_TIER_KINDS = ["token_tranche"] as const;

/**
 * Os PRIKUPLJANJA (docs/19 §6.4). Isporuka (gradnja, priključak) nije stanje
 * kampanje nego se izvodi iz `timeline_steps`.
 */
export const CAMPAIGN_STATES = [
  "draft",
  "review",
  "active",
  "funded",
  "closed",
  "cancelled",
] as const;
export type CampaignState = (typeof CAMPAIGN_STATES)[number];

export const VISIBILITIES = ["private", "unlisted", "public"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** P1 (energy docs/14 §6): mi smo izvođač i nositelj, ili klijent nosi svoje šine. */
export const CAMPAIGN_MODES = ["integrated", "byo"] as const;
export type CampaignMode = (typeof CAMPAIGN_MODES)[number];

/** P2: čiji su Monerium IBAN i Safe. */
export const CAMPAIGN_RAILS = ["platform", "client"] as const;
export type CampaignRails = (typeof CAMPAIGN_RAILS)[number];

/** Vertikala = tablica 1:1 uz kampanju. Jezgra ne zna što je u njoj. */
export const VERTICALS = ["none", "energy", "community"] as const;
export type Vertical = (typeof VERTICALS)[number];

export const RECURRENCES = ["none", "monthly", "quarterly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/** Energy E1: prvo pitanje pri kreiranju kampanje. */
export const HOLDER_TYPES = [
  "association",
  "cooperative",
  "municipality",
  "company",
  "person",
  "community",
] as const;
export type HolderType = (typeof HOLDER_TYPES)[number];

export const TIER_KINDS = ["reward", "ticket", "none"] as const;
export type TierKind = (typeof TIER_KINDS)[number];

/** energy `ContributionRail` (`sepa | eure | card`) + pinka `payment_rail` (`onchain`). */
export const PAYMENT_RAILS = ["sepa", "onchain", "card"] as const;
export type PaymentRail = (typeof PAYMENT_RAILS)[number];

/** 1:1 pinka `contribution_state`. */
export const CONTRIBUTION_STATES = ["pending", "paid", "failed", "refunded", "expired"] as const;
export type ContributionState = (typeof CONTRIBUTION_STATES)[number];

/** 1:1 pinka `payout_state`. */
export const PAYOUT_STATES = ["requested", "approved", "submitted", "confirmed", "failed"] as const;
export type PayoutState = (typeof PAYOUT_STATES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** `url = null` znači da dokument NIJE priložen; nikad placeholder poveznica. */
export const DOCUMENT_KINDS = [
  "site_right",
  "statute",
  "contractor_quote",
  "grid_decision",
  "contract",
  "other",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Vertikala `energy`: koraci isporuke od prijave do prve kWh (energy K1). */
export const ENERGY_TIMELINE_STEPS = [
  "submitted",
  "funded",
  "signed",
  "ordered",
  "mounted",
  "connected",
] as const;
export type EnergyTimelineStep = (typeof ENERGY_TIMELINE_STEPS)[number];

/** Vertikala `energy`: pravo na lokaciju (energy E6). */
export const SITE_RIGHTS = ["owner", "co_owner_consent", "building_right", "lease"] as const;
export type SiteRight = (typeof SITE_RIGHTS)[number];

/** Vertikala `community`. */
export const COMMUNITY_LEGAL_FORMS = ["association", "cooperative", "not_yet_registered"] as const;
export type CommunityLegalForm = (typeof COMMUNITY_LEGAL_FORMS)[number];

export const COMMUNITY_REGISTRATION_STATES = ["idea", "preparing", "filed", "registered"] as const;
export type CommunityRegistrationState = (typeof COMMUNITY_REGISTRATION_STATES)[number];

export const MEMBER_ROLES = ["member", "board", "signer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Pomoćnik za provjeru pripadnosti skupu bez `as`. */
export function isOneOf<const T extends readonly string[]>(
  set: T,
  value: string,
): value is T[number] {
  return (set as readonly string[]).includes(value);
}
