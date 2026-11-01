/**
 * Invarijante jezgre. Jedno mjesto: iste provjere koristi čarobnjak (prije
 * spremanja), Worker (prije upisa u D1) i deploy (provjera s lanca).
 * Dvije kopije pravila raziđu se tiho.
 */
import type { CampaignState, Visibility } from "./sets.js";
import type { Address, CampaignSafe, TimelineStep } from "./types.js";

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isAddress(value: string): value is Address {
  return ADDRESS_RE.test(value);
}

/** Valjana adresa koja nije nulta. Nulta adresa kao odredište = spaljen novac. */
export function isUsableAddress(value: string | null | undefined): value is Address {
  return typeof value === "string" && isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS;
}

/**
 * P7 (energy docs/05 §4.1, docs/14 §4) — invarijanta sukoba interesa.
 *
 * Potpisnici platforme NIKAD ne smiju činiti VEĆINU praga. Većina je strogo više
 * od polovice: uz prag 3 većina je 2, pa je jedan ključ dopušten; uz prag 2 je
 * također dopušten jedan, jer i tada treba tuđi potpis.
 *
 * ⚠️ U Modu 2 (`byo`) platforma nije potpisnik uopće; to provjerava
 * `violatesModeSigners`, ne ova funkcija.
 *
 * Prima samo prag i broj naših potpisnika, da ista provjera radi i na postojećem
 * Safeu i na onome koji se tek slaže u čarobnjaku.
 *
 * @returns true ako konfiguracija krši invarijantu — tada se kampanja ne sprema.
 */
export function violatesConflictInvariant(
  safe: Pick<CampaignSafe, "threshold" | "platform_signer_count">,
): boolean {
  return safe.platform_signer_count * 2 > safe.threshold;
}

/** Mod 2: klijentove šine, platforma ne drži nijedan ključ. */
export function violatesModeSigners(
  mode: "integrated" | "byo",
  safe: Pick<CampaignSafe, "platform_signer_count">,
): boolean {
  return mode === "byo" && safe.platform_signer_count !== 0;
}

/** Prag mora biti dostižan i barem 1. */
export function isValidThreshold(safe: Pick<CampaignSafe, "threshold" | "owners">): boolean {
  return Number.isInteger(safe.threshold) && safe.threshold >= 1 && safe.threshold <= safe.owners.length;
}

/**
 * Smije li kampanja primati novac od javnosti koja je vidi.
 * Bez provjerenog Safea nema upute za uplatu (energy docs/15 §6) — invarijanta,
 * ne stil.
 */
export function canAcceptContributions(
  campaign: { readonly state: CampaignState; readonly visibility: Visibility },
  safe: Pick<CampaignSafe, "address" | "threshold" | "owners" | "platform_signer_count" | "verified_at"> | null,
): boolean {
  if (campaign.state !== "active") return false;
  if (safe === null) return false;
  if (!isUsableAddress(safe.address)) return false;
  if (!isValidThreshold(safe)) return false;
  if (violatesConflictInvariant(safe)) return false;
  return safe.verified_at !== null;
}

/**
 * Faza isporuke izvedena iz koraka (docs/19 §6.4): zadnji korak po `sort` koji
 * se dogodio. `null` = nijedan korak se još nije dogodio ili ih kampanja nema.
 */
export function currentDeliveryStep(steps: readonly TimelineStep[]): string | null {
  let current: TimelineStep | null = null;
  for (const step of steps) {
    if (step.actual === null) continue;
    if (current === null || step.sort > current.sort) current = step;
  }
  return current?.key ?? null;
}
