/**
 * Prijevod vrijednosti iz pinka_finance i iz starog energy modela u jezgru
 * (energy docs/19 §6.3, §6.4).
 *
 * Pravilo: ono što jezgra ne smije nositi se ODBIJA s razlogom, nikad se tiho
 * ne prevodi u nešto dopušteno. `tokenization` koja postane `donation` bila bi
 * gora od pada.
 */
import {
  CAMPAIGN_STATES,
  REJECTED_PINKA_CAMPAIGN_TYPES,
  REJECTED_PINKA_TIER_KINDS,
  isOneOf,
  type CampaignState,
  type CampaignType,
  type DocumentKind,
  type TierKind,
} from "./sets.js";

export type MapResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

const ok = <T>(value: T): MapResult<T> => ({ ok: true, value });
const fail = <T>(reason: string): MapResult<T> => ({ ok: false, reason });

// ─────────────────────────────────────────────────────────────────────────────
// pinka_finance → jezgra
// ─────────────────────────────────────────────────────────────────────────────

const PINKA_TYPE: Readonly<Record<string, CampaignType>> = {
  donation: "donation",
  crowdfund: "reward",
  tickets: "tickets",
};

export function fromPinkaCampaignType(value: string): MapResult<CampaignType> {
  if (isOneOf(REJECTED_PINKA_CAMPAIGN_TYPES, value)) {
    return fail(`pinka type "${value}" je izvan pravne granice jezgre (energy docs/03 §3)`);
  }
  const mapped = PINKA_TYPE[value];
  return mapped === undefined ? fail(`nepoznat pinka type "${value}"`) : ok(mapped);
}

/** pinka `campaign_state` je podskup jezgre (nema `review`). */
export function fromPinkaCampaignState(value: string): MapResult<CampaignState> {
  return isOneOf(CAMPAIGN_STATES, value) && value !== "review"
    ? ok(value)
    : fail(`nepoznat pinka state "${value}"`);
}

export function fromPinkaTierKind(value: string): MapResult<TierKind> {
  if (isOneOf(REJECTED_PINKA_TIER_KINDS, value)) {
    return fail(`pinka tier kind "${value}" je izvan pravne granice jezgre (energy docs/03 §3)`);
  }
  if (value === "reward" || value === "ticket" || value === "none") return ok(value);
  return fail(`nepoznat pinka tier kind "${value}"`);
}

/** pinka `campaigns.chain` je tekst; jezgra drži chain id. */
const PINKA_CHAIN: Readonly<Record<string, number>> = {
  gnosis: 100,
  chiado: 10200,
};

export function fromPinkaChain(value: string | null): MapResult<number> {
  const id = PINKA_CHAIN[(value ?? "gnosis").toLowerCase()];
  return id === undefined ? fail(`nepoznat pinka chain "${value}"`) : ok(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// jezgra → pinka_finance (jednosmjerna projekcija, docs/19 §8.2, D3 kasnije)
// ─────────────────────────────────────────────────────────────────────────────

const TO_PINKA_TYPE: Readonly<Record<CampaignType, string | null>> = {
  donation: "donation",
  reward: "crowdfund",
  tickets: "tickets",
  /** Pinka nema članski ulog; projekcija ga ne smije prikazati kao donaciju. */
  membership: null,
};

export function toPinkaCampaignType(value: CampaignType): MapResult<string> {
  const mapped = TO_PINKA_TYPE[value];
  return mapped === null ? fail(`pinka nema vrstu za "${value}"`) : ok(mapped);
}

/** `review` u pinki ne postoji; dok je u pregledu, kampanja je ondje `draft`. */
export function toPinkaCampaignState(value: CampaignState): string {
  return value === "review" ? "draft" : value;
}

// ─────────────────────────────────────────────────────────────────────────────
// stari energy model (lib/types.ts) → jezgra
// ─────────────────────────────────────────────────────────────────────────────

export function fromEnergyProjectModel(value: "donation" | "community"): CampaignType {
  return value === "community" ? "membership" : "donation";
}

/**
 * Energy je miješao prikupljanje i isporuku. `building` i `completed` su
 * prikupljanje završeno (`funded`); faza isporuke ide u `timeline_steps`.
 * `expired` = rok prošao bez cilja → `closed`.
 */
export function fromEnergyProjectState(
  value: "draft" | "review" | "active" | "funded" | "expired" | "building" | "completed",
): CampaignState {
  switch (value) {
    case "expired":
      return "closed";
    case "building":
    case "completed":
      return "funded";
    default:
      return value;
  }
}

export function fromEnergyDocumentKind(
  value: "site_right" | "statute" | "installer_quote" | "grid_decision" | "other",
): DocumentKind {
  return value === "installer_quote" ? "contractor_quote" : value;
}
