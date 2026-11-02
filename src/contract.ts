/**
 * Opis zajedničkih tablica između D1 jezgre i pinka_finance (energy docs/19 §8.2).
 *
 * Za svaki stupac: SQLite tip, smije li biti NULL, zatvoreni skup vrijednosti,
 * je li JSON ili boolean, i ime stupca u pinka_finance (`tablica.stupac`) ako
 * ondje postoji. Iz ovoga se provjeravaju:
 *  - D1 migracije (J2): točno ovi stupci i `CHECK`ovi;
 *  - pinka shema: svaki `pinka` mora postojati u snimci `contract/pinka-columns.json`.
 *
 * `satisfies ColumnsOf<T>` znači da kompilator ruši build ako polje u tipu nema
 * red ovdje ili red ovdje nema polje u tipu. Opis i tip se ne mogu tiho razići.
 */
import {
  CAMPAIGN_MODES,
  CAMPAIGN_RAILS,
  CAMPAIGN_STATES,
  CAMPAIGN_TYPES,
  COMMUNITY_LEGAL_FORMS,
  COMMUNITY_REGISTRATION_STATES,
  CONTRIBUTION_STATES,
  DOCUMENT_KINDS,
  HOLDER_TYPES,
  MEMBER_ROLES,
  PAYMENT_RAILS,
  PAYOUT_STATES,
  RECURRENCES,
  SITE_RIGHTS,
  SUBSCRIPTION_STATUSES,
  TIER_KINDS,
  VERTICALS,
  VISIBILITIES,
} from "./sets.js";
import type {
  BudgetLine,
  Campaign,
  CampaignCommunity,
  CampaignDocument,
  CampaignEnergy,
  CampaignSafe,
  CampaignStats,
  CampaignSubject,
  CampaignTier,
  Contribution,
  ContributionEvent,
  ContributionProfile,
  Member,
  Milestone,
  Organizer,
  Payout,
  Subscription,
  TimelineStep,
} from "./types.js";

export type SqlType = "TEXT" | "INTEGER" | "REAL";

/** Tablica i stupac u pinka_finance, npr. `campaigns.destination_address`. */
export type PinkaRef = `${string}.${string}`;

/** Tablica i stupac u ovoj bazi, npr. `campaigns.id`. */
export type TableRef = `${string}.${string}`;

export interface Column {
  readonly sql: SqlType;
  readonly nullable: boolean;
  /** Zatvoreni skup → `CHECK (x IN (…))`. */
  readonly values?: readonly string[];
  /** `TEXT CHECK (json_valid(x))`. */
  readonly json?: true;
  /** `INTEGER CHECK (x IN (0, 1))`. */
  readonly bool?: true;
  /** Ime u pinka_finance, ako stupac ondje postoji. */
  readonly pinka?: PinkaRef;
  /** Strani ključ na tablicu ove baze (`tablica.stupac`) → `REFERENCES` u D1. */
  readonly ref?: TableRef;
  /** Vrijednost pokazuje izvan ove baze (rail, lanac); nije strani ključ. */
  readonly external?: string;
  /** Značenje stupca, za dijagram (`schema.dbml`) i čitatelja. */
  readonly note?: string;
}

type ColumnsOf<T> = { readonly [K in keyof T]-?: Column };

export interface TableSpec<T> {
  readonly name: string;
  /** Čemu tablica služi; ide u `schema.dbml`. */
  readonly note: string;
  readonly primaryKey: readonly (keyof T & string)[];
  /** Jedinstveni ključevi; `where` = parcijalni indeks (`… IS NOT NULL`). */
  readonly unique?: readonly {
    readonly columns: readonly (keyof T & string)[];
    readonly where?: string;
  }[];
  readonly columns: ColumnsOf<T>;
}

// Kratice da tablice ostanu čitljive.
const text = (nullable = false, extra: Partial<Column> = {}): Column => ({ sql: "TEXT", nullable, ...extra });
const int = (nullable = false, extra: Partial<Column> = {}): Column => ({ sql: "INTEGER", nullable, ...extra });
const real = (nullable = false, extra: Partial<Column> = {}): Column => ({ sql: "REAL", nullable, ...extra });
const bool = (extra: Partial<Column> = {}): Column => ({ sql: "INTEGER", nullable: false, bool: true, ...extra });
const json = (extra: Partial<Column> = {}): Column => ({ sql: "TEXT", nullable: false, json: true, ...extra });
const oneOf = (values: readonly string[], nullable = false, extra: Partial<Column> = {}): Column => ({
  sql: "TEXT",
  nullable,
  values,
  ...extra,
});

// ─────────────────────────────────────────────────────────────────────────────

export const campaigns: TableSpec<Campaign> = {
  name: "campaigns",
  note: "Jezgra: jedan red za svaku kampanju bilo koje vrste. Što je specifično za vertikalu (elektrana, zajednica) živi u tablici 1:1 uz nju.",
  primaryKey: ["id"],
  unique: [{ columns: ["tenant_id", "slug"] }],
  columns: {
    id: text(false, { pinka: "campaigns.id" }),
    tenant_id: text(false, { note: "čije šine; dijeljenje baze ide po tenantu", external: "pay.domovina.ai tenants.id" }),
    organizer_id: text(false, { ref: "organizers.id" }),
    slug: text(false, { note: "jedinstven po tenantu; nepromjenjiv nakon active", pinka: "campaigns.slug" }),
    type: oneOf(CAMPAIGN_TYPES, false, { note: "vrsta kampanje; tokenization i realestate ne postoje", pinka: "campaigns.type" }),
    vertical: oneOf(VERTICALS, false, { note: "koja tablica 1:1 nosi specifično" }),
    title: text(false, { pinka: "campaigns.title" }),
    description: text(true, { pinka: "campaigns.description" }),
    goal_cents: int(true, { pinka: "campaigns.goal_cents" }),
    min_contribution_cents: int(true, { pinka: "campaigns.min_contribution_cents" }),
    max_contributors: int(true, { note: "gornja granica broja doprinositelja (trošak po članu)" }),
    currency: text(false, { note: "ISO 4217", pinka: "campaigns.currency" }),
    state: oneOf(CAMPAIGN_STATES, false, { note: "os prikupljanja; isporuka se čita iz timeline_steps", pinka: "campaigns.state" }),
    visibility: oneOf(VISIBILITIES, false, { pinka: "campaigns.visibility" }),
    mode: oneOf(CAMPAIGN_MODES, false, { note: "integrated = Mod 1 (mi izvodimo), byo = Mod 2 (klijentove šine)" }),
    rails: oneOf(CAMPAIGN_RAILS, false, { note: "čiji su Monerium IBAN i Safe" }),
    starts_at: int(true, { pinka: "campaigns.starts_at" }),
    ends_at: int(true, { pinka: "campaigns.ends_at" }),
    recurrence: oneOf(RECURRENCES, false, { pinka: "campaigns.recurrence" }),
    cover_image_url: text(true, { pinka: "campaigns.cover_image_url" }),
    lat: real(true, { pinka: "campaigns.latitude" }),
    lng: real(true, { pinka: "campaigns.longitude" }),
    location_name: text(true, { pinka: "campaigns.location_name" }),
    surplus_intent: text(true, { note: "izjava o namjeni viška iznad cilja" }),
    demo: bool({ note: "maketa se deklarira kao maketa" }),
    metadata: json({ note: "slobodna proširenja; ništa o čemu ovisi novac", pinka: "campaigns.metadata" }),
    created_by: text(true, { pinka: "campaigns.account_id" }),
    created_at: int(false, { pinka: "campaigns.created_at" }),
    updated_at: int(false, { pinka: "campaigns.updated_at" }),
    deleted_at: int(true, { pinka: "campaigns.deleted_at" }),
  },
};

export const campaignSafes: TableSpec<CampaignSafe> = {
  name: "campaign_safes",
  note: "Safe kampanje, 1:1. Novac stoji ovdje, ne kod platforme. Uplate se primaju tek kad je verified_at postavljen i invarijanta sukoba interesa drži.",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { pinka: "campaigns.id", ref: "campaigns.id" }),
    address: text(false, { pinka: "campaigns.destination_address", external: "Safe na lancu chain_id" }),
    chain_id: int(false, { note: "100 Gnosis, 10200 Chiado", pinka: "campaigns.chain" }),
    threshold: int(false, { note: "M iz M-od-N" }),
    owners: json(),
    platform_signer_count: int(false, { note: "koliko ključeva drži platforma; 2 × ovo ≤ threshold" }),
    deployed_at: int(true, { pinka: "campaigns.safe_deployed_at" }),
    verified_at: int(true, { note: "zadnja provjera vlasnika i praga s lanca" }),
  },
};

export const organizers: TableSpec<Organizer> = {
  name: "organizers",
  note: "Pravni nositelj kampanje. is_platform = Mod 1 (mi smo izvođač), tada je objava sukoba interesa obavezna.",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "organizer_records.account_id" }),
    tenant_id: text(false, { external: "pay.domovina.ai tenants.id" }),
    holder_type: oneOf(HOLDER_TYPES),
    legal_name: text(false, { pinka: "organizer_records.legal_name" }),
    oib: text(true, { note: "za pravne osobe javan; prikazuje se, ne pretražuje", pinka: "organizer_records.oib" }),
    address_line: text(true, { pinka: "organizer_records.address_line" }),
    city: text(true, { pinka: "organizer_records.city" }),
    postal_code: text(true, { pinka: "organizer_records.postal_code" }),
    country_code: text(false, { pinka: "organizer_records.country_code" }),
    contact_email: text(true, { pinka: "organizer_records.contact_email" }),
    is_platform: bool({ note: "Mod 1: objava sukoba interesa obavezna" }),
    created_at: int(false, { pinka: "organizer_records.created_at" }),
    updated_at: int(false, { pinka: "organizer_records.updated_at" }),
  },
};

export const campaignSubjects: TableSpec<CampaignSubject> = {
  name: "campaign_subjects",
  note: "Na što se kampanja odnosi, polimorfno: plant:<id>, podcast_channel:<id>, external:pinka:<id>.",
  primaryKey: ["id"],
  unique: [{ columns: ["campaign_id", "subject_type", "subject_ref"] }],
  columns: {
    id: text(false, { pinka: "campaign_subjects.id" }),
    campaign_id: text(false, { pinka: "campaign_subjects.campaign_id", ref: "campaigns.id" }),
    subject_type: text(false, { pinka: "campaign_subjects.subject_type" }),
    subject_ref: text(false, { pinka: "campaign_subjects.subject_ref" }),
    created_at: int(false, { pinka: "campaign_subjects.created_at" }),
  },
};

export const campaignTiers: TableSpec<CampaignTier> = {
  name: "campaign_tiers",
  note: "Paketi doprinosa (nagrada, ulaznica ili bez). Nikad tranša tokena: token_tranche je izvan pravne granice.",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "campaign_tiers.id" }),
    campaign_id: text(false, { pinka: "campaign_tiers.campaign_id", ref: "campaigns.id" }),
    title: text(false, { pinka: "campaign_tiers.title" }),
    description: text(true, { pinka: "campaign_tiers.description" }),
    kind: oneOf(TIER_KINDS, false, { pinka: "campaign_tiers.kind" }),
    price_cents: int(true, { pinka: "campaign_tiers.price_cents" }),
    inventory_total: int(true, { pinka: "campaign_tiers.inventory_total" }),
    inventory_claimed: int(false, { note: "povećava ga upis doprinosa", pinka: "campaign_tiers.inventory_claimed" }),
    unit: text(true, { pinka: "campaign_tiers.unit" }),
    sort: int(false, { pinka: "campaign_tiers.sort" }),
    sale_start: int(true, { pinka: "campaign_tiers.sale_start" }),
    sale_end: int(true, { pinka: "campaign_tiers.sale_end" }),
    metadata: json({ pinka: "campaign_tiers.metadata" }),
    created_at: int(false, { pinka: "campaign_tiers.created_at" }),
    updated_at: int(false, { pinka: "campaign_tiers.updated_at" }),
  },
};

export const budgetLines: TableSpec<BudgetLine> = {
  name: "budget_lines",
  note: "Razrada troška, javna PRIJE uplate. Marža izvođača je zaseban red (is_contractor_margin), da „0 %” nikad ne stoji samo.",
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(false, { ref: "campaigns.id" }),
    sort: int(),
    label: text(),
    amount_cents: int(),
    is_contractor_margin: bool({ note: "naša marža kao izvođača" }),
  },
};

export const milestones: TableSpec<Milestone> = {
  name: "milestones",
  note: "Plan isplate po situacijama. Izvedba je payouts.",
  primaryKey: ["id"],
  unique: [{ columns: ["campaign_id", "key"] }],
  columns: {
    id: text(),
    campaign_id: text(false, { ref: "campaigns.id" }),
    key: text(),
    label: text(),
    amount_cents: int(),
    sort: int(),
  },
};

export const payouts: TableSpec<Payout> = {
  name: "payouts",
  note: "Isplata iz Safea: prijedlog (safe_tx_hash) → potpisi → transakcija (tx_hash).",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "payouts.id" }),
    campaign_id: text(false, { pinka: "payouts.campaign_id", ref: "campaigns.id" }),
    milestone_id: text(true, { ref: "milestones.id" }),
    amount_cents: int(false, { pinka: "payouts.amount_cents" }),
    destination: text(false, { note: "adresa primatelja isplate", pinka: "payouts.destination" }),
    state: oneOf(PAYOUT_STATES, false, { pinka: "payouts.state" }),
    safe_tx_hash: text(true, { note: "prijedlog u Safeu, prije potpisa" }),
    tx_hash: text(true, { pinka: "payouts.tx_hash" }),
    requested_by: text(true, { pinka: "payouts.requested_by" }),
    created_at: int(false, { pinka: "payouts.created_at" }),
    updated_at: int(false, { pinka: "payouts.updated_at" }),
  },
};

export const timelineSteps: TableSpec<TimelineStep> = {
  name: "timeline_steps",
  note: "Tijek isporuke: svaki korak ima plan i ostvarenje, da se kašnjenje vidi. Ključeve određuje vertikala.",
  primaryKey: ["campaign_id", "key"],
  columns: {
    campaign_id: text(false, { ref: "campaigns.id" }),
    key: text(false, { note: "npr. submitted … connected za energy" }),
    sort: int(),
    planned: int(true),
    actual: int(true),
    note: text(true, { note: "objašnjenje pomaka, stoji na stranici" }),
  },
};

export const campaignDocuments: TableSpec<CampaignDocument> = {
  name: "campaign_documents",
  note: "Dokazi uz kampanju. url = NULL znači da dokument nije priložen; nikad placeholder poveznica.",
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(false, { ref: "campaigns.id" }),
    kind: oneOf(DOCUMENT_KINDS),
    label: text(false, { note: "naziv iz izvora, ne prevodi se" }),
    url: text(true, { note: "NULL = nije priložen" }),
    issued_at: int(true),
  },
};

export const contributions: TableSpec<Contribution> = {
  name: "contributions",
  note: "Knjiga doprinosa: projekcija raila (pay.domovina.ai) i lanca. Rail je izvor istine za novac; red se uvijek može ponovo izgraditi. Djelomični UNIQUE ključevi čine upis idempotentnim.",
  primaryKey: ["id"],
  unique: [
    { columns: ["payment_intent_sid"], where: "payment_intent_sid IS NOT NULL" },
    { columns: ["monerium_order_id"], where: "monerium_order_id IS NOT NULL" },
    { columns: ["tx_hash", "log_index"], where: "log_index IS NOT NULL" },
    { columns: ["payment_rail", "external_payment_ref"], where: "external_payment_ref IS NOT NULL" },
  ],
  columns: {
    id: text(false, { pinka: "contributions.id" }),
    campaign_id: text(false, { pinka: "contributions.campaign_id", ref: "campaigns.id" }),
    tier_id: text(true, { pinka: "contributions.tier_id", ref: "campaign_tiers.id" }),
    quantity: int(false, { pinka: "contributions.quantity" }),
    amount_cents: int(false, { pinka: "contributions.amount_cents" }),
    amount_received_cents: int(true, { pinka: "contributions.amount_received_cents" }),
    currency: text(false, { pinka: "contributions.currency" }),
    state: oneOf(CONTRIBUTION_STATES, false, { pinka: "contributions.state" }),
    payment_rail: oneOf(PAYMENT_RAILS, false, { pinka: "contributions.payment_rail" }),
    payment_intent_sid: text(true, { note: "idempotentni ključ s raila", pinka: "contributions.payment_intent_sid", external: "pay.domovina.ai payment_intents.sid" }),
    monerium_order_id: text(true, { note: "idempotentni ključ SEPA naloga", pinka: "contributions.monerium_order_id" }),
    tx_hash: text(true, { note: "idempotentno s log_index", pinka: "contributions.forward_tx_hash" }),
    log_index: int(true, { pinka: "contributions.onchain_log_index" }),
    onchain_from: text(true, { pinka: "contributions.onchain_from" }),
    external_payment_ref: text(true, { pinka: "contributions.external_payment_ref" }),
    payer_iban_hash: text(true, { note: "HMAC IBAN-a; sam IBAN se ne sprema", pinka: "contributions.payer_iban_hash" }),
    underpaid: bool({ note: "stiglo manje od amount_cents", pinka: "contributions.underpaid" }),
    created_at: int(false, { pinka: "contributions.created_at" }),
    paid_at: int(true, { pinka: "contributions.paid_at" }),
    updated_at: int(false, { pinka: "contributions.updated_at" }),
  },
};

export const contributionEvents: TableSpec<ContributionEvent> = {
  name: "contribution_events",
  note: "Dnevnik doprinosa, samo dodavanje. Nikad UPDATE ni DELETE.",
  primaryKey: ["id"],
  columns: {
    id: int(false, { note: "rastući redni broj", pinka: "contribution_events.id" }),
    contribution_id: text(false, { pinka: "contribution_events.contribution_id", ref: "contributions.id" }),
    campaign_id: text(false, { pinka: "contribution_events.campaign_id", ref: "campaigns.id" }),
    event_type: text(false, { pinka: "contribution_events.event_type" }),
    payload: json({ pinka: "contribution_events.payload" }),
    created_at: int(false, { pinka: "contribution_events.created_at" }),
  },
};

export const contributionProfiles: TableSpec<ContributionProfile> = {
  name: "contribution_profiles",
  note: "Javni prikaz doprinosa, 1:1, odvojen od knjige: ime, poruka, anonimnost.",
  primaryKey: ["contribution_id"],
  columns: {
    contribution_id: text(false, { pinka: "contributions.id", ref: "contributions.id" }),
    anonymous: bool({ pinka: "contributions.anonymous" }),
    display_name: text(true, { pinka: "contributions.display_name" }),
    display_name_verified: bool({ note: "ime potvrđeno s banke", pinka: "contributions.display_name_verified" }),
    message: text(true, { pinka: "contributions.message" }),
    message_hidden: bool({ pinka: "contributions.message_hidden" }),
    link_url: text(true, { pinka: "contributions.link_url" }),
    bank_verified: bool({ pinka: "contributions.bank_verified" }),
    updated_at: int(false, { pinka: "contributions.updated_at" }),
  },
};

export const campaignStats: TableSpec<CampaignStats> = {
  name: "campaign_stats",
  note: "Agregat 1:1, ažurira ga upis doprinosa, da javno čitanje ne zbraja po zahtjevu.",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { pinka: "campaign_stats.campaign_id", ref: "campaigns.id" }),
    raised_cents: int(false, { pinka: "campaign_stats.total_raised_cents" }),
    contribution_count: int(false, { pinka: "campaign_stats.contribution_count" }),
    contributor_count: int(false, { pinka: "campaign_stats.contributor_count" }),
    last_contribution_at: int(true, { pinka: "campaign_stats.last_contribution_at" }),
    updated_at: int(false, { pinka: "campaign_stats.updated_at" }),
  },
};

export const subscriptions: TableSpec<Subscription> = {
  name: "subscriptions",
  note: "Ponavljajući doprinos istog uplatitelja (po HMAC-u IBAN-a).",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "subscriptions.id" }),
    campaign_id: text(false, { pinka: "subscriptions.campaign_id", ref: "campaigns.id" }),
    payer_iban_hash: text(false, { note: "HMAC IBAN-a", pinka: "subscriptions.payer_iban_hash" }),
    status: oneOf(SUBSCRIPTION_STATUSES, false, { pinka: "subscriptions.status" }),
    interval_days: int(true, { pinka: "subscriptions.interval_days" }),
    contribution_count: int(false, { pinka: "subscriptions.contribution_count" }),
    total_cents: int(false, { pinka: "subscriptions.total_cents" }),
    first_contribution_at: int(true, { pinka: "subscriptions.first_contribution_at" }),
    last_contribution_at: int(true, { pinka: "subscriptions.last_contribution_at" }),
    next_expected_at: int(true, { pinka: "subscriptions.next_expected_at" }),
    cancelled_at: int(true, { pinka: "subscriptions.cancelled_at" }),
    created_at: int(false, { pinka: "subscriptions.created_at" }),
    updated_at: int(false, { pinka: "subscriptions.updated_at" }),
  },
};

export const campaignEnergy: TableSpec<CampaignEnergy> = {
  name: "campaign_energy",
  note: "Vertikala elektrana, 1:1 uz kampanju (vertical = energy).",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { ref: "campaigns.id" }),
    plant_id: text(true, { note: "NULL dok nije upisana u registar", external: "registar elektrana (energy)" }),
    power_kw: real(false, { note: "snaga u kWp" }),
    connections: int(false, { note: "broj HEP-ODS priključaka" }),
    grid_status: text(true),
    site_right: oneOf(SITE_RIGHTS, false, { note: "pravo na lokaciju" }),
    site_right_document_id: text(true, { ref: "campaign_documents.id" }),
    gnosis_node: bool({ note: "elektrana pogoni i Gnosis validator" }),
    contractor: text(true, { note: "tko gradi; kad je to platforma, objava sukoba interesa je trajna" }),
  },
};

export const campaignCommunity: TableSpec<CampaignCommunity> = {
  name: "campaign_community",
  note: "Vertikala energetska zajednica, 1:1 uz kampanju (vertical = community).",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { ref: "campaigns.id" }),
    legal_form: oneOf(COMMUNITY_LEGAL_FORMS),
    registration_state: oneOf(COMMUNITY_REGISTRATION_STATES),
    statute_document_id: text(true, { ref: "campaign_documents.id" }),
  },
};

export const members: TableSpec<Member> = {
  name: "members",
  note: "Članovi zajednice. Udio je u proizvedenoj energiji i glasu, nikad u dobiti.",
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(false, { ref: "campaigns.id" }),
    person_ref: text(false, { note: "osoba izvan ove baze" }),
    role: oneOf(MEMBER_ROLES),
    share_basis_points: int(false, { note: "udio u energiji i glasu, 10000 = 100 %; nikad u dobiti" }),
    joined_at: int(),
  },
};

/** Jezgra: ima je svaka kampanja. */
export const CORE_TABLES = [
  campaigns,
  campaignSafes,
  organizers,
  campaignSubjects,
  campaignTiers,
  budgetLines,
  milestones,
  payouts,
  timelineSteps,
  campaignDocuments,
  contributions,
  contributionEvents,
  contributionProfiles,
  campaignStats,
  subscriptions,
] as const;

/** Vertikale: tablica 1:1 (ili 1:N) uz kampanju, jezgra ne zna za njih. */
export const VERTICAL_TABLES = [campaignEnergy, campaignCommunity, members] as const;

export const ALL_TABLES = [...CORE_TABLES, ...VERTICAL_TABLES] as const;
