/**
 * Tipovi redaka jezgre kampanje (energy docs/19 §5).
 *
 * Konvencije, iste kao D1 raila:
 * - ID je `string` (UUIDv7, generira Worker);
 * - vrijeme je unix **milisekunde** (`number`), `null` = nije se dogodilo;
 * - novac je u **centima**, cijeli broj (`*_cents`);
 * - JSON stupci su ovdje već parsirani (u D1 su `TEXT CHECK(json_valid(…))`);
 * - booleani su `boolean` (u D1 `INTEGER` 0/1; pretvara mapper retka, J2).
 *
 * Imena polja su imena stupaca. Svako polje ima red u `contract.ts`, a tip
 * kompilatora provjerava da se ta dva ne raziđu.
 */
import type {
  CampaignMode,
  CampaignRails,
  CampaignState,
  CampaignType,
  CommunityLegalForm,
  CommunityRegistrationState,
  ContributionState,
  DocumentKind,
  HolderType,
  MemberRole,
  PaymentRail,
  PayoutState,
  Recurrence,
  SiteRight,
  SubscriptionStatus,
  TierKind,
  Vertical,
  Visibility,
} from "./sets.js";

export type Address = `0x${string}`;
export type UnixMs = number;

// ─────────────────────────────────────────────────────────────────────────────
// Jezgra
// ─────────────────────────────────────────────────────────────────────────────

export interface Campaign {
  readonly id: string;
  /** Čije šine (rail `tenants.id`). Dijeljenje baze ide po tenantu (docs/19 §7). */
  readonly tenant_id: string;
  readonly organizer_id: string;
  /** Jedinstven po tenantu, bez obzira na velika slova; nepromjenjiv nakon `active`. */
  readonly slug: string;
  readonly type: CampaignType;
  readonly vertical: Vertical;
  readonly title: string;
  readonly description: string | null;
  readonly goal_cents: number | null;
  readonly min_contribution_cents: number | null;
  /** Energy K2: gornja granica broja doprinositelja (trošak po članu). */
  readonly max_contributors: number | null;
  /** ISO 4217, velika slova. */
  readonly currency: string;
  readonly state: CampaignState;
  readonly visibility: Visibility;
  readonly mode: CampaignMode;
  readonly rails: CampaignRails;
  readonly starts_at: UnixMs | null;
  readonly ends_at: UnixMs | null;
  readonly recurrence: Recurrence;
  readonly cover_image_url: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly location_name: string | null;
  /** Energy E5: izjava o namjeni viška kad kampanja prijeđe cilj. */
  readonly surplus_intent: string | null;
  /** Pravilo 3: maketa se deklarira kao maketa. */
  readonly demo: boolean;
  /** Slobodna proširenja; ništa što se pretražuje ili o čemu ovisi novac. */
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly created_by: string | null;
  readonly created_at: UnixMs;
  readonly updated_at: UnixMs;
  readonly deleted_at: UnixMs | null;
}

/** Safe kampanje (energy `SafeAccount` + pinka `destination_address`). */
export interface CampaignSafe {
  readonly campaign_id: string;
  readonly address: Address;
  /** 100 = Gnosis, 10200 = Chiado. */
  readonly chain_id: number;
  /** M iz M-od-N. */
  readonly threshold: number;
  readonly owners: readonly Address[];
  /** Koliko potpisnika je platforma. Vidi `violatesConflictInvariant`. */
  readonly platform_signer_count: number;
  readonly deployed_at: UnixMs | null;
  /** Zadnja provjera vlasnika i praga s lanca (energy `check-beta.mts`). */
  readonly verified_at: UnixMs | null;
}

/** Pravni nositelj kampanje (pinka `organizer_records` + energy `holder_*`). */
export interface Organizer {
  readonly id: string;
  readonly tenant_id: string;
  readonly holder_type: HolderType;
  readonly legal_name: string;
  /** Prikazuje se, ne pretražuje. Za pravne osobe javan podatak. */
  readonly oib: string | null;
  readonly address_line: string | null;
  readonly city: string | null;
  readonly postal_code: string | null;
  readonly country_code: string;
  readonly contact_email: string | null;
  /** Platforma sama (Mod 1): tada je objava sukoba interesa obavezna. */
  readonly is_platform: boolean;
  readonly created_at: UnixMs;
  readonly updated_at: UnixMs;
}

/** Polimorfna veza na predmet: `plant:<id>`, `podcast_channel:<id>`, `external:pinka:<id>`. */
export interface CampaignSubject {
  readonly id: string;
  readonly campaign_id: string;
  readonly subject_type: string;
  readonly subject_ref: string;
  readonly created_at: UnixMs;
}

export interface CampaignTier {
  readonly id: string;
  readonly campaign_id: string;
  readonly title: string;
  readonly description: string | null;
  readonly kind: TierKind;
  readonly price_cents: number | null;
  readonly inventory_total: number | null;
  readonly inventory_claimed: number;
  readonly unit: string | null;
  readonly sort: number;
  readonly sale_start: UnixMs | null;
  readonly sale_end: UnixMs | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly created_at: UnixMs;
  readonly updated_at: UnixMs;
}

/** Energy P5: razrada troška, javna PRIJE uplate. */
export interface BudgetLine {
  readonly id: string;
  readonly campaign_id: string;
  readonly sort: number;
  readonly label: string;
  readonly amount_cents: number;
  /** Naša marža kao izvođača. „0 %" se nikad ne piše bez ovoga u istom vidnom polju. */
  readonly is_contractor_margin: boolean;
}

/** Energy P6: plan isplate po situaciji. Izvedba je `Payout`. */
export interface Milestone {
  readonly id: string;
  readonly campaign_id: string;
  readonly key: string;
  readonly label: string;
  readonly amount_cents: number;
  readonly sort: number;
}

export interface Payout {
  readonly id: string;
  readonly campaign_id: string;
  readonly milestone_id: string | null;
  readonly amount_cents: number;
  readonly destination: Address;
  readonly state: PayoutState;
  /** Prijedlog transakcije u Safeu, prije potpisa. */
  readonly safe_tx_hash: string | null;
  readonly tx_hash: string | null;
  readonly requested_by: string | null;
  readonly created_at: UnixMs;
  readonly updated_at: UnixMs;
}

/** Energy K1: korak nosi i plan i ostvarenje, da se kašnjenje vidi. */
export interface TimelineStep {
  readonly campaign_id: string;
  /** Skup ključeva određuje vertikala (npr. `ENERGY_TIMELINE_STEPS`). */
  readonly key: string;
  readonly sort: number;
  readonly planned: UnixMs | null;
  readonly actual: UnixMs | null;
  /** Objašnjenje pomaka. Stoji na stranici, ne u mailu. */
  readonly note: string | null;
}

export interface CampaignDocument {
  readonly id: string;
  readonly campaign_id: string;
  readonly kind: DocumentKind;
  /** Naziv iz izvora, ne prevodi se. */
  readonly label: string;
  /** `null` ⇒ nije priložen. NIKAD placeholder poveznica. */
  readonly url: string | null;
  readonly issued_at: UnixMs | null;
}

/**
 * Knjiga doprinosa: projekcija raila i lanca. Rail je izvor istine za novac;
 * ovaj red se uvijek može ponovo izgraditi. Idempotentni ključevi (parcijalni
 * UNIQUE indeksi): `payment_intent_sid`, `monerium_order_id`,
 * `(tx_hash, log_index)`, `(payment_rail, external_payment_ref)`.
 */
export interface Contribution {
  readonly id: string;
  readonly campaign_id: string;
  readonly tier_id: string | null;
  readonly quantity: number;
  readonly amount_cents: number;
  readonly amount_received_cents: number | null;
  readonly currency: string;
  readonly state: ContributionState;
  readonly payment_rail: PaymentRail;
  readonly payment_intent_sid: string | null;
  readonly monerium_order_id: string | null;
  readonly tx_hash: string | null;
  readonly log_index: number | null;
  readonly onchain_from: Address | null;
  readonly external_payment_ref: string | null;
  /** HMAC IBAN-a uplatitelja; sam IBAN se ne sprema. */
  readonly payer_iban_hash: string | null;
  readonly underpaid: boolean;
  readonly created_at: UnixMs;
  readonly paid_at: UnixMs | null;
  readonly updated_at: UnixMs;
}

/** Append-only. Nikad UPDATE ni DELETE. */
export interface ContributionEvent {
  readonly id: number;
  readonly contribution_id: string;
  readonly campaign_id: string;
  readonly event_type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly created_at: UnixMs;
}

/** Javni prikaz doprinosa, odvojen od knjige (docs/19 §6.2). */
export interface ContributionProfile {
  readonly contribution_id: string;
  readonly anonymous: boolean;
  readonly display_name: string | null;
  readonly display_name_verified: boolean;
  readonly message: string | null;
  readonly message_hidden: boolean;
  readonly link_url: string | null;
  readonly bank_verified: boolean;
  readonly updated_at: UnixMs;
}

/** Agregat koji ažurira upis, da javno čitanje ne zbraja po zahtjevu. */
export interface CampaignStats {
  readonly campaign_id: string;
  readonly raised_cents: number;
  readonly contribution_count: number;
  readonly contributor_count: number;
  readonly last_contribution_at: UnixMs | null;
  readonly updated_at: UnixMs;
}

export interface Subscription {
  readonly id: string;
  readonly campaign_id: string;
  readonly payer_iban_hash: string;
  readonly status: SubscriptionStatus;
  readonly interval_days: number | null;
  readonly contribution_count: number;
  readonly total_cents: number;
  readonly first_contribution_at: UnixMs | null;
  readonly last_contribution_at: UnixMs | null;
  readonly next_expected_at: UnixMs | null;
  readonly cancelled_at: UnixMs | null;
  readonly created_at: UnixMs;
  readonly updated_at: UnixMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertikale (1:1 uz kampanju)
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignEnergy {
  readonly campaign_id: string;
  /** Elektrana u registru; `null` dok nije upisana. */
  readonly plant_id: string | null;
  readonly power_kw: number;
  /** Broj HEP-ODS priključaka. */
  readonly connections: number;
  readonly grid_status: string | null;
  readonly site_right: SiteRight;
  readonly site_right_document_id: string | null;
  readonly gnosis_node: boolean;
  /** Tko gradi. Kad je to platforma, objava sukoba interesa je trajna (energy docs/14 §4). */
  readonly contractor: string | null;
}

export interface CampaignCommunity {
  readonly campaign_id: string;
  readonly legal_form: CommunityLegalForm;
  readonly registration_state: CommunityRegistrationState;
  readonly statute_document_id: string | null;
}

/**
 * Član zajednice. `share_basis_points` je udio u PROIZVEDENOJ ENERGIJI i glasu,
 * nikad u dobiti (energy docs/03 §3).
 */
export interface Member {
  readonly id: string;
  readonly campaign_id: string;
  readonly person_ref: string;
  readonly role: MemberRole;
  readonly share_basis_points: number;
  readonly joined_at: UnixMs;
}
