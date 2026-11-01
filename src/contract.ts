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
}

type ColumnsOf<T> = { readonly [K in keyof T]-?: Column };

export interface TableSpec<T> {
  readonly name: string;
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
  primaryKey: ["id"],
  unique: [{ columns: ["tenant_id", "slug"] }],
  columns: {
    id: text(false, { pinka: "campaigns.id" }),
    tenant_id: text(),
    organizer_id: text(),
    slug: text(false, { pinka: "campaigns.slug" }),
    type: oneOf(CAMPAIGN_TYPES, false, { pinka: "campaigns.type" }),
    vertical: oneOf(VERTICALS),
    title: text(false, { pinka: "campaigns.title" }),
    description: text(true, { pinka: "campaigns.description" }),
    goal_cents: int(true, { pinka: "campaigns.goal_cents" }),
    min_contribution_cents: int(true, { pinka: "campaigns.min_contribution_cents" }),
    max_contributors: int(true),
    currency: text(false, { pinka: "campaigns.currency" }),
    state: oneOf(CAMPAIGN_STATES, false, { pinka: "campaigns.state" }),
    visibility: oneOf(VISIBILITIES, false, { pinka: "campaigns.visibility" }),
    mode: oneOf(CAMPAIGN_MODES),
    rails: oneOf(CAMPAIGN_RAILS),
    starts_at: int(true, { pinka: "campaigns.starts_at" }),
    ends_at: int(true, { pinka: "campaigns.ends_at" }),
    recurrence: oneOf(RECURRENCES, false, { pinka: "campaigns.recurrence" }),
    cover_image_url: text(true, { pinka: "campaigns.cover_image_url" }),
    lat: real(true, { pinka: "campaigns.latitude" }),
    lng: real(true, { pinka: "campaigns.longitude" }),
    location_name: text(true, { pinka: "campaigns.location_name" }),
    surplus_intent: text(true),
    demo: bool(),
    metadata: json({ pinka: "campaigns.metadata" }),
    created_by: text(true, { pinka: "campaigns.account_id" }),
    created_at: int(false, { pinka: "campaigns.created_at" }),
    updated_at: int(false, { pinka: "campaigns.updated_at" }),
    deleted_at: int(true, { pinka: "campaigns.deleted_at" }),
  },
};

export const campaignSafes: TableSpec<CampaignSafe> = {
  name: "campaign_safes",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { pinka: "campaigns.id" }),
    address: text(false, { pinka: "campaigns.destination_address" }),
    chain_id: int(false, { pinka: "campaigns.chain" }),
    threshold: int(),
    owners: json(),
    platform_signer_count: int(),
    deployed_at: int(true, { pinka: "campaigns.safe_deployed_at" }),
    verified_at: int(true),
  },
};

export const organizers: TableSpec<Organizer> = {
  name: "organizers",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "organizer_records.account_id" }),
    tenant_id: text(),
    holder_type: oneOf(HOLDER_TYPES),
    legal_name: text(false, { pinka: "organizer_records.legal_name" }),
    oib: text(true, { pinka: "organizer_records.oib" }),
    address_line: text(true, { pinka: "organizer_records.address_line" }),
    city: text(true, { pinka: "organizer_records.city" }),
    postal_code: text(true, { pinka: "organizer_records.postal_code" }),
    country_code: text(false, { pinka: "organizer_records.country_code" }),
    contact_email: text(true, { pinka: "organizer_records.contact_email" }),
    is_platform: bool(),
    created_at: int(false, { pinka: "organizer_records.created_at" }),
    updated_at: int(false, { pinka: "organizer_records.updated_at" }),
  },
};

export const campaignSubjects: TableSpec<CampaignSubject> = {
  name: "campaign_subjects",
  primaryKey: ["id"],
  unique: [{ columns: ["campaign_id", "subject_type", "subject_ref"] }],
  columns: {
    id: text(false, { pinka: "campaign_subjects.id" }),
    campaign_id: text(false, { pinka: "campaign_subjects.campaign_id" }),
    subject_type: text(false, { pinka: "campaign_subjects.subject_type" }),
    subject_ref: text(false, { pinka: "campaign_subjects.subject_ref" }),
    created_at: int(false, { pinka: "campaign_subjects.created_at" }),
  },
};

export const campaignTiers: TableSpec<CampaignTier> = {
  name: "campaign_tiers",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "campaign_tiers.id" }),
    campaign_id: text(false, { pinka: "campaign_tiers.campaign_id" }),
    title: text(false, { pinka: "campaign_tiers.title" }),
    description: text(true, { pinka: "campaign_tiers.description" }),
    kind: oneOf(TIER_KINDS, false, { pinka: "campaign_tiers.kind" }),
    price_cents: int(true, { pinka: "campaign_tiers.price_cents" }),
    inventory_total: int(true, { pinka: "campaign_tiers.inventory_total" }),
    inventory_claimed: int(false, { pinka: "campaign_tiers.inventory_claimed" }),
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
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(),
    sort: int(),
    label: text(),
    amount_cents: int(),
    is_contractor_margin: bool(),
  },
};

export const milestones: TableSpec<Milestone> = {
  name: "milestones",
  primaryKey: ["id"],
  unique: [{ columns: ["campaign_id", "key"] }],
  columns: {
    id: text(),
    campaign_id: text(),
    key: text(),
    label: text(),
    amount_cents: int(),
    sort: int(),
  },
};

export const payouts: TableSpec<Payout> = {
  name: "payouts",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "payouts.id" }),
    campaign_id: text(false, { pinka: "payouts.campaign_id" }),
    milestone_id: text(true),
    amount_cents: int(false, { pinka: "payouts.amount_cents" }),
    destination: text(false, { pinka: "payouts.destination" }),
    state: oneOf(PAYOUT_STATES, false, { pinka: "payouts.state" }),
    safe_tx_hash: text(true),
    tx_hash: text(true, { pinka: "payouts.tx_hash" }),
    requested_by: text(true, { pinka: "payouts.requested_by" }),
    created_at: int(false, { pinka: "payouts.created_at" }),
    updated_at: int(false, { pinka: "payouts.updated_at" }),
  },
};

export const timelineSteps: TableSpec<TimelineStep> = {
  name: "timeline_steps",
  primaryKey: ["campaign_id", "key"],
  columns: {
    campaign_id: text(),
    key: text(),
    sort: int(),
    planned: int(true),
    actual: int(true),
    note: text(true),
  },
};

export const campaignDocuments: TableSpec<CampaignDocument> = {
  name: "campaign_documents",
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(),
    kind: oneOf(DOCUMENT_KINDS),
    label: text(),
    url: text(true),
    issued_at: int(true),
  },
};

export const contributions: TableSpec<Contribution> = {
  name: "contributions",
  primaryKey: ["id"],
  unique: [
    { columns: ["payment_intent_sid"], where: "payment_intent_sid IS NOT NULL" },
    { columns: ["monerium_order_id"], where: "monerium_order_id IS NOT NULL" },
    { columns: ["tx_hash", "log_index"], where: "log_index IS NOT NULL" },
    { columns: ["payment_rail", "external_payment_ref"], where: "external_payment_ref IS NOT NULL" },
  ],
  columns: {
    id: text(false, { pinka: "contributions.id" }),
    campaign_id: text(false, { pinka: "contributions.campaign_id" }),
    tier_id: text(true, { pinka: "contributions.tier_id" }),
    quantity: int(false, { pinka: "contributions.quantity" }),
    amount_cents: int(false, { pinka: "contributions.amount_cents" }),
    amount_received_cents: int(true, { pinka: "contributions.amount_received_cents" }),
    currency: text(false, { pinka: "contributions.currency" }),
    state: oneOf(CONTRIBUTION_STATES, false, { pinka: "contributions.state" }),
    payment_rail: oneOf(PAYMENT_RAILS, false, { pinka: "contributions.payment_rail" }),
    payment_intent_sid: text(true, { pinka: "contributions.payment_intent_sid" }),
    monerium_order_id: text(true, { pinka: "contributions.monerium_order_id" }),
    tx_hash: text(true, { pinka: "contributions.forward_tx_hash" }),
    log_index: int(true, { pinka: "contributions.onchain_log_index" }),
    onchain_from: text(true, { pinka: "contributions.onchain_from" }),
    external_payment_ref: text(true, { pinka: "contributions.external_payment_ref" }),
    payer_iban_hash: text(true, { pinka: "contributions.payer_iban_hash" }),
    underpaid: bool({ pinka: "contributions.underpaid" }),
    created_at: int(false, { pinka: "contributions.created_at" }),
    paid_at: int(true, { pinka: "contributions.paid_at" }),
    updated_at: int(false, { pinka: "contributions.updated_at" }),
  },
};

export const contributionEvents: TableSpec<ContributionEvent> = {
  name: "contribution_events",
  primaryKey: ["id"],
  columns: {
    id: int(false, { pinka: "contribution_events.id" }),
    contribution_id: text(false, { pinka: "contribution_events.contribution_id" }),
    campaign_id: text(false, { pinka: "contribution_events.campaign_id" }),
    event_type: text(false, { pinka: "contribution_events.event_type" }),
    payload: json({ pinka: "contribution_events.payload" }),
    created_at: int(false, { pinka: "contribution_events.created_at" }),
  },
};

export const contributionProfiles: TableSpec<ContributionProfile> = {
  name: "contribution_profiles",
  primaryKey: ["contribution_id"],
  columns: {
    contribution_id: text(false, { pinka: "contributions.id" }),
    anonymous: bool({ pinka: "contributions.anonymous" }),
    display_name: text(true, { pinka: "contributions.display_name" }),
    display_name_verified: bool({ pinka: "contributions.display_name_verified" }),
    message: text(true, { pinka: "contributions.message" }),
    message_hidden: bool({ pinka: "contributions.message_hidden" }),
    link_url: text(true, { pinka: "contributions.link_url" }),
    bank_verified: bool({ pinka: "contributions.bank_verified" }),
    updated_at: int(false, { pinka: "contributions.updated_at" }),
  },
};

export const campaignStats: TableSpec<CampaignStats> = {
  name: "campaign_stats",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(false, { pinka: "campaign_stats.campaign_id" }),
    raised_cents: int(false, { pinka: "campaign_stats.total_raised_cents" }),
    contribution_count: int(false, { pinka: "campaign_stats.contribution_count" }),
    contributor_count: int(false, { pinka: "campaign_stats.contributor_count" }),
    last_contribution_at: int(true, { pinka: "campaign_stats.last_contribution_at" }),
    updated_at: int(false, { pinka: "campaign_stats.updated_at" }),
  },
};

export const subscriptions: TableSpec<Subscription> = {
  name: "subscriptions",
  primaryKey: ["id"],
  columns: {
    id: text(false, { pinka: "subscriptions.id" }),
    campaign_id: text(false, { pinka: "subscriptions.campaign_id" }),
    payer_iban_hash: text(false, { pinka: "subscriptions.payer_iban_hash" }),
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
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(),
    plant_id: text(true),
    power_kw: real(),
    connections: int(),
    grid_status: text(true),
    site_right: oneOf(SITE_RIGHTS),
    site_right_document_id: text(true),
    gnosis_node: bool(),
    contractor: text(true),
  },
};

export const campaignCommunity: TableSpec<CampaignCommunity> = {
  name: "campaign_community",
  primaryKey: ["campaign_id"],
  columns: {
    campaign_id: text(),
    legal_form: oneOf(COMMUNITY_LEGAL_FORMS),
    registration_state: oneOf(COMMUNITY_REGISTRATION_STATES),
    statute_document_id: text(true),
  },
};

export const members: TableSpec<Member> = {
  name: "members",
  primaryKey: ["id"],
  columns: {
    id: text(),
    campaign_id: text(),
    person_ref: text(),
    role: oneOf(MEMBER_ROLES),
    share_basis_points: int(),
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
