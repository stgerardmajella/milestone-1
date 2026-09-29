import { describe, expect, it } from "vitest";

import type {
  QueryIntent,
  SearchPlan,
} from "./contracts";

import {
  IntentValidationError,
  validateQueryIntent,
  validateSearchPlan,
} from "./validation";

function createIntent(): QueryIntent {
  return {
    rawQuery:
      "romantic outdoor activities in Cape Town under R500",
    intentType: "discovery",
    category: "activities",
    entities: {
      location: {
        value: {
          city: "Cape Town",
        },
        source: "explicit",
        confidence: 1,
        evidence: [
          { text: "Cape Town" },
        ],
      },
      budget: {
        value: {
          max: 500,
          currency: "ZAR",
        },
        source: "explicit",
        confidence: 1,
        evidence: [
          { text: "under R500" },
        ],
      },
      relationship: undefined,
      audience: undefined,
      date: undefined,
      time: undefined,
      people: undefined,
      moods: [
        {
          value: "romantic",
          source: "explicit",
          confidence: 1,
          evidence: [
            { text: "romantic" },
          ],
        },
        {
          value: "outdoor",
          source: "explicit",
          confidence: 1,
          evidence: [
            { text: "outdoor" },
          ],
        },
      ],
      activities: [],
    },
    semantics: {
      preferences: [
        "romantic",
        "outdoor",
      ],
      keywords: [
        "romantic",
        "outdoor",
        "activities",
        "Cape Town",
        "R500",
      ],
      constraints: [
        "budget.max <= 500",
      ],
    },
    understanding: {
      confidence: 1,
      ambiguities: [],
      evidence: [
        { text: "romantic" },
        { text: "outdoor" },
        { text: "Cape Town" },
        { text: "under R500" },
      ],
    },
  };
}

function createPlan(): SearchPlan {
  return {
    providers: [
      "activities",
      "places",
      "events",
      "web",
    ],
    breadth: "standard",
    filters: [
      {
        field: "budget.max",
        operator: "lte",
        value: 500,
      },
    ],
    rankingSignals: [
      "location_relevance",
      "budget_relevance",
      "mood_relevance",
    ],
    clarification: {
      required: false,
      fields: [],
    },
  };
}

describe("Intent Engine v1 validation", () => {
  it("accepts a valid QueryIntent", () => {
    expect(() =>
      validateQueryIntent(createIntent()),
    ).not.toThrow();
  });

  it("accepts a valid SearchPlan", () => {
    expect(() =>
      validateSearchPlan(createPlan()),
    ).not.toThrow();
  });

  it("rejects empty raw queries", () => {
    const intent = createIntent();
    intent.rawQuery = "   ";

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow(IntentValidationError);
  });

  it("rejects confidence above 1", () => {
    const intent = createIntent();
    intent.understanding.confidence = 1.1;

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow("between 0 and 1");
  });

  it("rejects confidence below 0", () => {
    const intent = createIntent();
    intent.understanding.confidence = -0.1;

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow("between 0 and 1");
  });

  it("rejects invalid budget ranges", () => {
    const intent = createIntent();

    intent.entities.budget!.value = {
      min: 600,
      max: 500,
      currency: "ZAR",
    };

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow(
      "budget.max must be >= entities.budget.min",
    );
  });

  it("rejects negative people counts", () => {
    const intent = createIntent();

    intent.entities.people = {
      value: {
        count: -1,
      },
      source: "explicit",
      confidence: 1,
      evidence: [
        { text: "minus one person" },
      ],
    };

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow("non-negative integer");
  });

  it("rejects invalid calendar dates", () => {
    const intent = createIntent();

    intent.entities.date = {
      value: {
        value: "2026-02-30",
      },
      source: "explicit",
      confidence: 1,
      evidence: [
        { text: "30 February" },
      ],
    };

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow(
      "valid ISO calendar date",
    );
  });

  it("rejects an empty provider plan", () => {
    const plan = createPlan();
    plan.providers = [];

    expect(() =>
      validateSearchPlan(plan),
    ).toThrow(
      "must contain at least one provider",
    );
  });

  it("requires clarification fields when clarification is required", () => {
    const plan = createPlan();

    plan.clarification = {
      required: true,
      fields: [],
    };

    expect(() =>
      validateSearchPlan(plan),
    ).toThrow(
      "clarification.fields",
    );
  });

  it("rejects reversed evidence offsets", () => {
    const intent = createIntent();

    intent.understanding.evidence = [
      {
        text: "Cape Town",
        sourceStart: 10,
        sourceEnd: 5,
      },
    ];

    expect(() =>
      validateQueryIntent(intent),
    ).toThrow(
      "sourceEnd must be >= sourceStart",
    );
  });
});