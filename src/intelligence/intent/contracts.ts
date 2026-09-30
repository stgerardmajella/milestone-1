export type IntentType =
  | "discovery"
  | "information";

export type IntentCategory =
  | "all"
  | "events"
  | "activities"
  | "places"
  | "web";

export type InterpretationSource =
  | "explicit"
  | "inferred"
  | "default"
  | "unknown";

export type SearchBreadth =
  | "narrow"
  | "standard"
  | "broad";

export type ProviderKind =
  | "activities"
  | "events"
  | "places"
  | "web";

export type Relationship =
  | "romantic"
  | "couple"
  | "friends"
  | "family"
  | "solo"
  | "colleagues"
  | "unknown";

export type Audience =
  | "solo"
  | "couple"
  | "friends"
  | "family"
  | "children"
  | "adults"
  | "general"
  | "unknown";

export type Mood =
  | "romantic"
  | "fun"
  | "outdoor"
  | "family"
  | "adventure"
  | "relaxing"
  | "nightlife"
  | "date_night";

export type Activity =
  | "pool_table"
  | "swimming_pool"
  | "bowling"
  | "movies"
  | "gaming"
  | "hiking"
  | "beach"
  | "food"
  | "live_music";

export interface Evidence {
  text: string;
  sourceStart?: number;
  sourceEnd?: number;
}

export interface Interpretation<T> {
  value: T;
  source: InterpretationSource;
  confidence: number;
  evidence: Evidence[];
}

export interface LocationIntent {
  text?: string;
  city?: string;
  suburb?: string;
  area?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface DateIntent {
    value?: string
    end?: string
    relative?: string
    isRange?: boolean
  }

  export interface TimeIntent {
    value?: string;
    end?: string;
    period?: "morning" | "afternoon" | "evening" | "night";
    periods?: Array<
      "morning" | "afternoon" | "evening" | "night"
    >;
  }

export interface BudgetIntent {
  min?: number;
  max?: number;
  currency: "ZAR";
}

export interface PeopleIntent {
  count?: number;
  adults?: number;
  children?: number;
}

export interface EntitiesIntent {
  location?: Interpretation<LocationIntent>;
  date?: Interpretation<DateIntent>;
  time?: Interpretation<TimeIntent>;
  budget?: Interpretation<BudgetIntent>;
  people?: Interpretation<PeopleIntent>;
  relationship?: Interpretation<Relationship>;
  audience?: Interpretation<Audience>;
  moods: Array<Interpretation<Mood>>;
  activities: Array<Interpretation<Activity>>;
}

export interface SearchSemantics {
  preferences: string[];
  keywords: string[];
  constraints: string[];
}

export interface Ambiguity {
  field: string;
  description: string;
  evidence: Evidence[];
}

export interface UnderstandingMetadata {
  confidence: number;
  ambiguities: Ambiguity[];
  evidence: Evidence[];
}

export interface QueryIntent {
  rawQuery: string;
  intentType: IntentType;
  category: IntentCategory;
  entities: EntitiesIntent;
  semantics: SearchSemantics;
  understanding: UnderstandingMetadata;
}

export interface SearchFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "lt"
    | "lte"
    | "gt"
    | "gte"
    | "between"
    | "contains";
  value: unknown;
}

export type RankingSignal =
  | "location_relevance"
  | "date_relevance"
  | "budget_relevance"
  | "category_relevance"
  | "mood_relevance"
  | "activity_relevance"
  | "keyword_relevance"
  | "preference_relevance";

export interface Clarification {
  required: boolean;
  fields: string[];
  reason?: string;
}

export interface SearchPlan {
  providers: ProviderKind[];
  breadth: SearchBreadth;
  filters: SearchFilter[];
  rankingSignals: RankingSignal[];
  clarification: Clarification;
}