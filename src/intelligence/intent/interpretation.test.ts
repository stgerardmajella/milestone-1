import { interpretQuery } from "./interpreter";
import { describe, expect, it } from "vitest";
import type {
  Activity,
  IntentCategory,
  IntentType,
  Mood,
  Relationship,
} from "./contracts";

type TestCase = {
  id: string;
  query: string;
  expected?: {
    intentType?: IntentType;
    category?: IntentCategory | IntentCategory[];
    location?: {
      city?: string;
      suburb?: string;
      text?: string;
    };
    date?: {
      relative?: string;
    };
    time?: {
      value?: string;
      periods?: Array<"morning" | "afternoon" | "evening" | "night">;
    };
    budget?: {
      min?: number;
      max?: number;
      currency?: "ZAR";
    };
    people?: {
      count?: number;
      adults?: number;
      children?: number;
    };
    relationship?: Relationship;
    moods?: Mood[];
    activities?: Activity[];
    keywords?: string[];
    preferences?: string[];
    ambiguities?: string[];
  };
  forbidden?: {
    budget?: boolean;
    date?: boolean;
    people?: boolean;
    relationship?: boolean;
    mood?: boolean;
    location?: boolean;
  };
  notes?: string;
};

/**
 * Find iT Intent Engine v1
 *
 * Behavioral contract:
 * - These cases define what the interpreter should understand.
 * - They intentionally do not implement the interpreter.
 * - SearchPlan behavior is tested separately.
 * - Flexible interpretations are documented rather than over-constrained.
 *
 * The implementation should eventually transform:
 *
 *   raw query -> QueryIntent
 *
 * without inventing unsupported facts.
 */
const interpretationCases: TestCase[] = [
  // ---------------------------------------------------------------------------
  // A. Basic discovery
  // ---------------------------------------------------------------------------

  {
    id: "INT-001",
    query: "things to do in Cape Town",
    expected: {
      intentType: "discovery",
      category: ["all", "activities"],
      location: { city: "Cape Town" },
    },
    forbidden: {
      budget: true,
      date: true,
      people: true,
      relationship: true,
      mood: true,
    },
  },
  {
    id: "INT-002",
    query: "fun things to do in Cape Town",
    expected: {
      intentType: "discovery",
      location: { city: "Cape Town" },
      moods: ["fun"],
    },
  },
  {
    id: "INT-003",
    query: "romantic things to do in Cape Town",
    expected: {
      intentType: "discovery",
      location: { city: "Cape Town" },
      moods: ["romantic"],
    },
    notes:
      "If relationship is inferred from romantic, its provenance must be inferred rather than explicit.",
  },
  {
    id: "INT-004",
    query: "something fun for tonight",
    expected: {
      intentType: "discovery",
      moods: ["fun"],
      date: { relative: "tonight" },
      time: { periods: ["evening", "night"] },
    },
    forbidden: {
      location: true,
    },
  },

  // ---------------------------------------------------------------------------
  // B. Category detection
  // ---------------------------------------------------------------------------

  {
    id: "INT-005",
    query: "events in Cape Town",
    expected: {
      intentType: "discovery",
      category: "events",
      location: { city: "Cape Town" },
    },
  },
  {
    id: "INT-006",
    query: "activities in Cape Town",
    expected: {
      intentType: "discovery",
      category: "activities",
      location: { city: "Cape Town" },
    },
  },
  {
    id: "INT-007",
    query: "places to eat in Cape Town",
    expected: {
      intentType: "discovery",
      category: "places",
      location: { city: "Cape Town" },
      activities: ["food"],
    },
  },
  {
    id: "INT-008",
    query: "what is happening in Cape Town this weekend",
    expected: {
      intentType: "discovery",
      category: "events",
      location: { city: "Cape Town" },
      date: { relative: "this weekend" },
    },
    notes:
      "v1 treats 'what is happening' as event discovery in this context.",
  },
  {
    id: "INT-009",
    query: "what does the V&A Waterfront offer",
    expected: {
      intentType: "information",
      category: ["web", "places"],
      location: { text: "V&A Waterfront" },
    },
    notes:
      "The critical assertion is information intent rather than ordinary discovery.",
  },

  // ---------------------------------------------------------------------------
  // C. Location
  // ---------------------------------------------------------------------------

  {
    id: "INT-010",
    query: "restaurants in Cape Town",
    expected: {
      location: { city: "Cape Town" },
    },
  },
  {
    id: "INT-011",
    query: "things to do in Sea Point",
    expected: {
      location: { suburb: "Sea Point" },
    },
  },
  {
    id: "INT-012",
    query: "things to do around the V&A Waterfront",
    expected: {
      location: { text: "V&A Waterfront" },
    },
  },
  {
    id: "INT-013",
    query: "things to do near me",
    expected: {
      location: { text: "near me" },
    },
    notes:
      "Runtime geolocation may resolve this later. The intent engine must not fabricate coordinates.",
  },
  {
    id: "INT-014",
    query: "things to do somewhere near Cape Town",
    expected: {
      location: { city: "Cape Town" },
    },
    notes:
      "Location is intentionally broad rather than an exact point.",
  },

  // ---------------------------------------------------------------------------
  // D. Dates and time
  // ---------------------------------------------------------------------------

  {
    id: "INT-015",
    query: "events this Saturday in Cape Town",
    expected: {
      intentType: "discovery",
      category: "events",
      location: { city: "Cape Town" },
      date: { relative: "this Saturday" },
    },
    notes:
      "The relative expression must not be inserted as an invalid literal date.",
  },
  {
    id: "INT-016",
    query: "events tomorrow",
    expected: {
      date: { relative: "tomorrow" },
    },
  },
  {
    id: "INT-017",
    query: "things to do tonight",
    expected: {
      date: { relative: "tonight" },
      time: { periods: ["evening", "night"] },
    },
  },
  {
    id: "INT-018",
    query: "things to do Saturday from 2pm",
    expected: {
      date: { relative: "Saturday" },
      time: { value: "14:00" },
    },
  },
  {
    id: "INT-019",
    query: "events from Friday to Sunday",
    expected: {
      date: {
        relative: "Friday to Sunday",
      },
    },
    notes:
      "The eventual structured representation should preserve a date range.",
  },
  {
    id: "INT-020",
    query: "events between 10 and 20 October",
    expected: {
      date: {
        relative: "10 to 20 October",
      },
    },
    notes:
      "Exact ISO calendar resolution can be tested once date-resolution rules are finalized.",
  },

  // ---------------------------------------------------------------------------
  // E. Budget
  // ---------------------------------------------------------------------------

  {
    id: "INT-021",
    query: "things to do under R500",
    expected: {
      budget: {
        max: 500,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-022",
    query: "things to do up to R300",
    expected: {
      budget: {
        max: 300,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-023",
    query: "free things to do in Cape Town",
    expected: {
      location: { city: "Cape Town" },
      budget: {
        max: 0,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-024",
    query: "things to do between R200 and R500",
    expected: {
      budget: {
        min: 200,
        max: 500,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-025",
    query: "cheap things to do in Cape Town",
    expected: {
      location: { city: "Cape Town" },
    },
    notes:
      "Cheap must not become an invented numeric budget. It may remain ambiguous or semantic.",
  },

  // ---------------------------------------------------------------------------
  // F. People
  // ---------------------------------------------------------------------------

  {
    id: "INT-026",
    query: "places for 4 people",
    expected: {
      people: {
        count: 4,
      },
    },
  },
  {
    id: "INT-027",
    query: "activities for 2 adults and 2 children",
    expected: {
      people: {
        count: 4,
        adults: 2,
        children: 2,
      },
    },
  },
  {
    id: "INT-028",
    query: "things to do for a family of five",
    expected: {
      people: {
        count: 5,
      },
      relationship: "family",
    },
    notes:
      "Audience/family semantics should also be represented when the interpreter supports it.",
  },
  {
    id: "INT-029",
    query: "things to do for two",
    expected: {
      people: {
        count: 2,
      },
    },
    forbidden: {
      relationship: true,
    },
    notes:
      "Two people must not automatically become a romantic couple.",
  },

  // ---------------------------------------------------------------------------
  // G. Relationship and audience
  // ---------------------------------------------------------------------------

  {
    id: "INT-030",
    query: "date night in Cape Town",
    expected: {
      relationship: "romantic",
      moods: ["date_night"],
      location: { city: "Cape Town" },
    },
    notes:
      "Romantic relationship is inferred from 'date night'.",
  },
  {
    id: "INT-031",
    query: "things to do with my girlfriend",
    expected: {
      relationship: "romantic",
    },
  },
  {
    id: "INT-032",
    query: "things to do with friends",
    expected: {
      relationship: "friends",
    },
  },
  {
    id: "INT-033",
    query: "family activities",
    expected: {
      relationship: "family",
      moods: ["family"],
    },
  },
  {
    id: "INT-034",
    query: "things to do alone",
    expected: {
      relationship: "solo",
    },
  },

  // ---------------------------------------------------------------------------
  // H. Mood and activity
  // ---------------------------------------------------------------------------

  {
    id: "INT-035",
    query: "fun romantic outdoor activities",
    expected: {
      moods: ["fun", "romantic", "outdoor"],
    },
  },
  {
    id: "INT-036",
    query: "outdoor activities for a date",
    expected: {
      moods: ["outdoor"],
      relationship: "romantic",
    },
    notes:
      "Romantic relationship is inferred from 'for a date'.",
  },
  {
    id: "INT-037",
    query: "places with live music",
    expected: {
      category: "places",
      activities: ["live_music"],
    },
  },
  {
    id: "INT-038",
    query: "somewhere to play pool",
    expected: {
      activities: ["pool_table"],
    },
  },
  {
    id: "INT-039",
    query: "bowling for friends",
    expected: {
      activities: ["bowling"],
      relationship: "friends",
    },
  },
  {
    id: "INT-040",
    query: "good food and live music",
    expected: {
      activities: ["food", "live_music"],
    },
  },

  // ---------------------------------------------------------------------------
  // I. Ambiguity
  // ---------------------------------------------------------------------------

  {
    id: "INT-041",
    query: "cheap restaurants near Cape Town",
    expected: {
      location: { city: "Cape Town" },
    },
    notes:
      "Budget should remain ambiguous/unknown unless a separate Find iT rule defines 'cheap'.",
  },
  {
    id: "INT-042",
    query: "somewhere nice for Saturday",
    expected: {
      date: { relative: "Saturday" },
      keywords: ["nice"],
    },
    forbidden: {
      location: true,
    },
  },
  {
    id: "INT-043",
    query: "something near the city",
    expected: {
      ambiguities: ["location"],
    },
  },
  {
    id: "INT-044",
    query: "somewhere romantic",
    expected: {
      moods: ["romantic"],
    },
    forbidden: {
      location: true,
    },
  },
  {
    id: "INT-045",
    query: "something for a group",
    expected: {
      ambiguities: ["people"],
    },
    notes:
      "No group size should be invented.",
  },

  // ---------------------------------------------------------------------------
  // J. Information queries
  // ---------------------------------------------------------------------------

  {
    id: "INT-046",
    query: "what is the V&A Waterfront",
    expected: {
      intentType: "information",
      category: "web",
      keywords: ["V&A Waterfront"],
    },
  },
  {
    id: "INT-047",
    query: "what time does Kirstenbosch close",
    expected: {
      intentType: "information",
      category: "web",
      keywords: ["Kirstenbosch"],
    },
  },
  {
    id: "INT-048",
    query: "how much does entry to Two Oceans Aquarium cost",
    expected: {
      intentType: "information",
      category: "web",
      keywords: ["Two Oceans Aquarium"],
    },
  },
  {
    id: "INT-049",
    query: "what does date night mean",
    expected: {
      intentType: "information",
      category: "web",
      keywords: ["date night"],
    },
  },

  // ---------------------------------------------------------------------------
  // K. Composite queries
  // ---------------------------------------------------------------------------

  {
    id: "INT-050",
    query: "fun romantic outdoor activities in Cape Town under R500",
    expected: {
      intentType: "discovery",
      category: "activities",
      location: { city: "Cape Town" },
      budget: {
        max: 500,
        currency: "ZAR",
      },
      moods: ["fun", "romantic", "outdoor"],
    },
  },
  {
    id: "INT-051",
    query:
      "romantic date night for two in Sea Point this Saturday under R800",
    expected: {
      intentType: "discovery",
      location: { suburb: "Sea Point" },
      date: { relative: "this Saturday" },
      people: {
        count: 2,
      },
      relationship: "romantic",
      moods: ["date_night"],
      budget: {
        max: 800,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-052",
    query:
      "events in Cape Town this weekend for 4 friends under R300",
    expected: {
      intentType: "discovery",
      category: "events",
      location: { city: "Cape Town" },
      date: { relative: "this weekend" },
      people: {
        count: 4,
      },
      relationship: "friends",
      budget: {
        max: 300,
        currency: "ZAR",
      },
    },
  },
  {
    id: "INT-053",
    query:
      "family-friendly outdoor activities for 2 adults and 2 kids this Sunday",
    expected: {
      intentType: "discovery",
      category: "activities",
      moods: ["family", "outdoor"],
      people: {
        count: 4,
        adults: 2,
        children: 2,
      },
      date: {
        relative: "this Sunday",
      },
    },
  },
  {
    id: "INT-054",
    query:
      "free things to do near the V&A Waterfront tonight with friends",
    expected: {
      intentType: "discovery",
      location: { text: "V&A Waterfront" },
      date: { relative: "tonight" },
      time: {
        periods: ["evening", "night"],
      },
      relationship: "friends",
      budget: {
        max: 0,
        currency: "ZAR",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // L. Anti-inference / restraint
  // ---------------------------------------------------------------------------

  {
    id: "INT-055",
    query: "what can I do in Cape Town",
    expected: {
      location: { city: "Cape Town" },
    },
    forbidden: {
      budget: true,
      date: true,
      people: true,
      relationship: true,
      mood: true,
    },
  },
  {
    id: "INT-056",
    query: "activities for two people",
    expected: {
      people: {
        count: 2,
      },
    },
    forbidden: {
      relationship: true,
    },
  },
  {
    id: "INT-057",
    query: "cheap activities",
    notes:
      "Must not invent a numeric budget from the word 'cheap'.",
  },
  {
    id: "INT-058",
    query: "somewhere nice",
    expected: {
      keywords: ["nice"],
    },
    forbidden: {
      location: true,
    },
  },
  {
    id: "INT-059",
    query: "this Saturday",
    expected: {
      date: {
        relative: "this Saturday",
      },
    },
    notes:
      "Must recognize the relative date without producing an invalid literal calendar date.",
  },
];

/**
 * Placeholder contract test.
 *
 * This intentionally fails until the interpretation function is connected.
 * Replace `undefined` with the real interpreter once its API is finalized.
 */
describe("Find iT Intent Engine v1 interpretation contract", () => {
  it("defines exactly 59 locked interpretation cases", () => {
    expect(interpretationCases).toHaveLength(59);
  });

  it("uses unique case identifiers", () => {
    const ids = interpretationCases.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses unique query strings", () => {
    const queries = interpretationCases.map((testCase) => testCase.query);
    expect(new Set(queries).size).toBe(queries.length);
  });

  it("covers INT-001 through INT-059", () => {
    const ids = interpretationCases.map((testCase) => testCase.id);

    for (let index = 1; index <= 59; index += 1) {
      expect(ids).toContain(`INT-${String(index).padStart(3, "0")}`);
    }
  });

  it("interprets INT-001: things to do in Cape Town", () => {
    const result = interpretQuery("things to do in Cape Town");

    expect(result.rawQuery).toBe("things to do in Cape Town");
    expect(result.intentType).toBe("discovery");
    expect(["all", "activities"]).toContain(result.category);
    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget).toBeUndefined();
    expect(result.entities.date).toBeUndefined();
    expect(result.entities.people).toBeUndefined();
    expect(result.entities.relationship).toBeUndefined();
    expect(result.entities.moods).toHaveLength(0);
  });

  it("interprets INT-002: fun things to do in Cape Town", () => {
    const result = interpretQuery("fun things to do in Cape Town");

    expect(result.intentType).toBe("discovery");
    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.moods).toHaveLength(1);
    expect(result.entities.moods[0].value).toBe("fun");
    expect(result.entities.moods[0].source).toBe("explicit");
    expect(result.entities.moods[0].confidence).toBe(1);
    expect(result.entities.moods[0].evidence).toEqual([
      { text: "fun" },
    ]);
  });

  it("interprets INT-003: romantic things to do in Cape Town", () => {
    const result = interpretQuery("romantic things to do in Cape Town");

    expect(result.intentType).toBe("discovery");
    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.moods).toHaveLength(1);
    expect(result.entities.moods[0].value).toBe("romantic");
    expect(result.entities.moods[0].source).toBe("explicit");
    expect(result.entities.moods[0].confidence).toBe(1);
    expect(result.entities.moods[0].evidence).toEqual([
      { text: "romantic" },
    ]);

    if (result.entities.relationship) {
      expect(result.entities.relationship.value).toBe("romantic");
      expect(result.entities.relationship.source).toBe("inferred");
    }
  });

  it("interprets INT-004: something fun for tonight", () => {
    const result = interpretQuery("something fun for tonight");

    expect(result.intentType).toBe("discovery");

    expect(result.entities.moods).toHaveLength(1);
    expect(result.entities.moods[0].value).toBe("fun");
    expect(result.entities.moods[0].source).toBe("explicit");

    expect(result.entities.date?.value).toEqual({
      relative: "tonight",
    });

    expect(result.entities.time?.value).toEqual({
      periods: ["evening", "night"],
    });

    expect(result.entities.location).toBeUndefined();
  });

  it("interprets INT-005: events in Cape Town", () => {
    const result = interpretQuery("events in Cape Town");

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("events");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });
  });

  it("interprets INT-006: activities in Cape Town", () => {
    const result = interpretQuery("activities in Cape Town");

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("activities");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });
  });

  it("interprets INT-007: places to eat in Cape Town", () => {
    const result = interpretQuery("places to eat in Cape Town");

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("places");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.activities.map((item) => item.value)).toEqual([
      "food",
    ]);
  });

  it("interprets INT-008: what is happening in Cape Town this weekend", () => {
    const result = interpretQuery(
      "what is happening in Cape Town this weekend",
    );

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("events");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.date?.value).toEqual({
      relative: "this weekend",
    });
  });

  it("interprets INT-009: what does the V&A Waterfront offer", () => {
    const result = interpretQuery(
      "what does the V&A Waterfront offer",
    );

    expect(result.intentType).toBe("information");
    expect(["web", "places"]).toContain(result.category);

    expect(result.entities.location?.value).toEqual({
      text: "V&A Waterfront",
    });
  });

  it("interprets INT-010: restaurants in Cape Town", () => {
    const result = interpretQuery("restaurants in Cape Town");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });
  });

  it("interprets INT-011: things to do in Sea Point", () => {
    const result = interpretQuery("things to do in Sea Point");

    expect(result.entities.location?.value).toEqual({
      suburb: "Sea Point",
    });
  });

  it("interprets INT-012: things to do around the V&A Waterfront", () => {
    const result = interpretQuery(
      "things to do around the V&A Waterfront",
    );

    expect(result.entities.location?.value).toEqual({
      text: "V&A Waterfront",
    });
  });

  it("interprets INT-013: things to do near me", () => {
    const result = interpretQuery("things to do near me");

    expect(result.entities.location?.value).toEqual({
      text: "near me",
    });

    expect(result.entities.location?.value.latitude).toBeUndefined();
    expect(result.entities.location?.value.longitude).toBeUndefined();
  });

  it("interprets INT-014: things to do somewhere near Cape Town", () => {
    const result = interpretQuery(
      "things to do somewhere near Cape Town",
    );

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });
  });

  it("interprets INT-015: events this Saturday in Cape Town", () => {
    const result = interpretQuery(
      "events this Saturday in Cape Town",
    );

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("events");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.date?.value).toEqual({
      relative: "this Saturday",
    });
  });

  it("interprets INT-016: events tomorrow", () => {
    const result = interpretQuery("events tomorrow");

    expect(result.entities.date?.value).toEqual({
      relative: "tomorrow",
    });
  });

  it("interprets INT-017: things to do tonight", () => {
    const result = interpretQuery("things to do tonight");

    expect(result.entities.date?.value).toEqual({
      relative: "tonight",
    });

    expect(result.entities.time?.value).toEqual({
      periods: ["evening", "night"],
    });
  });

  it("interprets INT-018: things to do Saturday from 2pm", () => {
    const result = interpretQuery(
      "things to do Saturday from 2pm",
    );

    expect(result.entities.date?.value).toEqual({
      relative: "Saturday",
    });

    expect(result.entities.time?.value).toEqual({
      value: "14:00",
    });
  });

  it("interprets INT-019: events from Friday to Sunday", () => {
    const result = interpretQuery(
      "events from Friday to Sunday",
    );

    expect(result.entities.date?.value).toEqual({
      relative: "Friday to Sunday",
    });
  });

  it("interprets INT-020: events between 10 and 20 October", () => {
    const result = interpretQuery(
      "events between 10 and 20 October",
    );

    expect(result.entities.date?.value).toEqual({
      relative: "10 to 20 October",
    });
  });

  it("interprets INT-021: things to do under R500", () => {
    const result = interpretQuery("things to do under R500");

    expect(result.entities.budget?.value).toEqual({
      max: 500,
      currency: "ZAR",
    });
  });

  it("interprets INT-022: things to do up to R300", () => {
    const result = interpretQuery("things to do up to R300");

    expect(result.entities.budget?.value).toEqual({
      max: 300,
      currency: "ZAR",
    });
  });

  it("interprets INT-023: free things to do in Cape Town", () => {
    const result = interpretQuery(
      "free things to do in Cape Town",
    );

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget?.value).toEqual({
      max: 0,
      currency: "ZAR",
    });
  });

  it("interprets INT-024: things to do between R200 and R500", () => {
    const result = interpretQuery(
      "things to do between R200 and R500",
    );

    expect(result.entities.budget?.value).toEqual({
      min: 200,
      max: 500,
      currency: "ZAR",
    });
  });

  it("interprets INT-025: cheap things to do in Cape Town", () => {
    const result = interpretQuery(
      "cheap things to do in Cape Town",
    );

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget).toBeUndefined();
  });

  it("interprets INT-026: places for 4 people", () => {
    const result = interpretQuery("places for 4 people");

    expect(result.entities.people?.value).toEqual({
      count: 4,
    });
  });

  it("interprets INT-027: activities for 2 adults and 2 children", () => {
    const result = interpretQuery(
      "activities for 2 adults and 2 children",
    );

    expect(result.entities.people?.value).toEqual({
      count: 4,
      adults: 2,
      children: 2,
    });
  });

  it("interprets INT-028: things to do for a family of five", () => {
    const result = interpretQuery(
      "things to do for a family of five",
    );

    expect(result.entities.people?.value).toEqual({
      count: 5,
    });

    expect(result.entities.relationship?.value).toBe("family");
  });

  it("interprets INT-029: things to do for two", () => {
    const result = interpretQuery("things to do for two");

    expect(result.entities.people?.value).toEqual({
      count: 2,
    });

    expect(result.entities.relationship).toBeUndefined();
  });

  it("interprets INT-030: date night in Cape Town", () => {
    const result = interpretQuery("date night in Cape Town");

    expect(result.entities.relationship?.value).toBe("romantic");
    expect(result.entities.relationship?.source).toBe("inferred");

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "date_night",
    ]);

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });
  });

  it("interprets INT-031: things to do with my girlfriend", () => {
    const result = interpretQuery(
      "things to do with my girlfriend",
    );

    expect(result.entities.relationship?.value).toBe("romantic");
  });

  it("interprets INT-032: things to do with friends", () => {
    const result = interpretQuery(
      "things to do with friends",
    );

    expect(result.entities.relationship?.value).toBe("friends");
  });

  it("interprets INT-033: family activities", () => {
    const result = interpretQuery("family activities");

    expect(result.entities.relationship?.value).toBe("family");

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "family",
    ]);
  });

  it("interprets INT-034: things to do alone", () => {
    const result = interpretQuery("things to do alone");

    expect(result.entities.relationship?.value).toBe("solo");
  });

  it("interprets INT-035: fun romantic outdoor activities", () => {
    const result = interpretQuery(
      "fun romantic outdoor activities",
    );

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "fun",
      "romantic",
      "outdoor",
    ]);
  });

  it("interprets INT-036: outdoor activities for a date", () => {
    const result = interpretQuery(
      "outdoor activities for a date",
    );

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "outdoor",
    ]);

    expect(result.entities.relationship?.value).toBe("romantic");
    expect(result.entities.relationship?.source).toBe("inferred");
  });

  it("interprets INT-037: places with live music", () => {
    const result = interpretQuery("places with live music");

    expect(result.category).toBe("places");

    expect(result.entities.activities.map((item) => item.value)).toEqual([
      "live_music",
    ]);
  });

  it("interprets INT-038: somewhere to play pool", () => {
    const result = interpretQuery("somewhere to play pool");

    expect(result.entities.activities.map((item) => item.value)).toEqual([
      "pool_table",
    ]);
  });

  it("interprets INT-039: bowling for friends", () => {
    const result = interpretQuery("bowling for friends");

    expect(result.entities.activities.map((item) => item.value)).toEqual([
      "bowling",
    ]);

    expect(result.entities.relationship?.value).toBe("friends");
  });

  it("interprets INT-040: good food and live music", () => {
    const result = interpretQuery(
      "good food and live music",
    );

    expect(result.entities.activities.map((item) => item.value)).toEqual([
      "food",
      "live_music",
    ]);
  });

  it("interprets INT-041: cheap restaurants near Cape Town", () => {
    const result = interpretQuery(
      "cheap restaurants near Cape Town",
    );

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget).toBeUndefined();
  });

  it("interprets INT-042: somewhere nice for Saturday", () => {
    const result = interpretQuery(
      "somewhere nice for Saturday",
    );

    expect(result.entities.date?.value).toEqual({
      relative: "Saturday",
    });

    expect(result.semantics.keywords).toContain("nice");
    expect(result.entities.location).toBeUndefined();
  });

  it("interprets INT-043: something near the city", () => {
    const result = interpretQuery(
      "something near the city",
    );

    expect(
      result.understanding.ambiguities.some(
        (item) => item.field === "location",
      ),
    ).toBe(true);
  });

  it("interprets INT-044: somewhere romantic", () => {
    const result = interpretQuery("somewhere romantic");

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "romantic",
    ]);

    expect(result.entities.location).toBeUndefined();
  });

  it("interprets INT-045: something for a group", () => {
    const result = interpretQuery(
      "something for a group",
    );

    expect(
      result.understanding.ambiguities.some(
        (item) => item.field === "people",
      ),
    ).toBe(true);
  });

  it("interprets INT-046: what is the V&A Waterfront", () => {
    const result = interpretQuery(
      "what is the V&A Waterfront",
    );

    expect(result.intentType).toBe("information");
    expect(result.category).toBe("web");
    expect(result.semantics.keywords).toContain(
      "V&A Waterfront",
    );
  });

  it("interprets INT-047: what time does Kirstenbosch close", () => {
    const result = interpretQuery(
      "what time does Kirstenbosch close",
    );

    expect(result.intentType).toBe("information");
    expect(result.category).toBe("web");
    expect(result.semantics.keywords).toContain("Kirstenbosch");
  });

  it("interprets INT-048: how much does entry to Two Oceans Aquarium cost", () => {
    const result = interpretQuery(
      "how much does entry to Two Oceans Aquarium cost",
    );

    expect(result.intentType).toBe("information");
    expect(result.category).toBe("web");
    expect(result.semantics.keywords).toContain(
      "Two Oceans Aquarium",
    );
  });

  it("interprets INT-049: what does date night mean", () => {
    const result = interpretQuery(
      "what does date night mean",
    );

    expect(result.intentType).toBe("information");
    expect(result.category).toBe("web");
    expect(result.semantics.keywords).toContain("date night");
  });

  it("interprets INT-050: fun romantic outdoor activities in Cape Town under R500", () => {
    const result = interpretQuery(
      "fun romantic outdoor activities in Cape Town under R500",
    );

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("activities");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget?.value).toEqual({
      max: 500,
      currency: "ZAR",
    });

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "fun",
      "romantic",
      "outdoor",
    ]);
  });

  it("interprets INT-051: romantic date night for two in Sea Point this Saturday under R800", () => {
    const result = interpretQuery(
      "romantic date night for two in Sea Point this Saturday under R800",
    );

    expect(result.intentType).toBe("discovery");

    expect(result.entities.location?.value).toEqual({
      suburb: "Sea Point",
    });

    expect(result.entities.date?.value).toEqual({
      relative: "this Saturday",
    });

    expect(result.entities.people?.value).toEqual({
      count: 2,
    });

    expect(result.entities.relationship?.value).toBe("romantic");

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "romantic",
      "date_night",
    ]);

    expect(result.entities.budget?.value).toEqual({
      max: 800,
      currency: "ZAR",
    });
  });

  it("interprets INT-052: events in Cape Town this weekend for 4 friends under R300", () => {
    const result = interpretQuery(
      "events in Cape Town this weekend for 4 friends under R300",
    );

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("events");

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.date?.value).toEqual({
      relative: "this weekend",
    });

    expect(result.entities.people?.value).toEqual({
      count: 4,
    });

    expect(result.entities.relationship?.value).toBe("friends");

    expect(result.entities.budget?.value).toEqual({
      max: 300,
      currency: "ZAR",
    });
  });

  it("interprets INT-053: family-friendly outdoor activities for 2 adults and 2 kids this Sunday", () => {
    const result = interpretQuery(
      "family-friendly outdoor activities for 2 adults and 2 kids this Sunday",
    );

    expect(result.intentType).toBe("discovery");
    expect(result.category).toBe("activities");

    expect(result.entities.moods.map((item) => item.value)).toEqual([
      "family",
      "outdoor",
    ]);

    expect(result.entities.people?.value).toEqual({
      count: 4,
      adults: 2,
      children: 2,
    });

    expect(result.entities.date?.value).toEqual({
      relative: "this Sunday",
    });
  });

  it("interprets INT-054: free things to do near the V&A Waterfront tonight with friends", () => {
    const result = interpretQuery(
      "free things to do near the V&A Waterfront tonight with friends",
    );

    expect(result.intentType).toBe("discovery");

    expect(result.entities.location?.value).toEqual({
      text: "V&A Waterfront",
    });

    expect(result.entities.date?.value).toEqual({
      relative: "tonight",
    });

    expect(result.entities.time?.value).toEqual({
      periods: ["evening", "night"],
    });

    expect(result.entities.relationship?.value).toBe("friends");

    expect(result.entities.budget?.value).toEqual({
      max: 0,
      currency: "ZAR",
    });
  });

  it("interprets INT-055: what can I do in Cape Town", () => {
    const result = interpretQuery(
      "what can I do in Cape Town",
    );

    expect(result.entities.location?.value).toEqual({
      city: "Cape Town",
    });

    expect(result.entities.budget).toBeUndefined();
    expect(result.entities.date).toBeUndefined();
    expect(result.entities.people).toBeUndefined();
    expect(result.entities.relationship).toBeUndefined();
    expect(result.entities.moods).toHaveLength(0);
  });

  it("interprets INT-056: activities for two people", () => {
    const result = interpretQuery(
      "activities for two people",
    );

    expect(result.entities.people?.value).toEqual({
      count: 2,
    });

    expect(result.entities.relationship).toBeUndefined();
  });

  it("interprets INT-057: cheap activities", () => {
    const result = interpretQuery("cheap activities");

    expect(result.entities.budget).toBeUndefined();
  });

  it("interprets INT-058: somewhere nice", () => {
    const result = interpretQuery("somewhere nice");

    expect(result.semantics.keywords).toContain("nice");
    expect(result.entities.location).toBeUndefined();
  });

  it("interprets INT-059: this Saturday", () => {
    const result = interpretQuery("this Saturday");

    expect(result.entities.date?.value).toEqual({
      relative: "this Saturday",
    });
  });
});
