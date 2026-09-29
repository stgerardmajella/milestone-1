import type {
    QueryIntent,
    SearchPlan,
    SearchFilter,
  } from "./contracts";

  export class IntentValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "IntentValidationError";
    }
  }

  function assertFiniteNumber(
    value: number,
    field: string,
  ): void {
    if (!Number.isFinite(value)) {
      throw new IntentValidationError(
        `${field} must be a finite number`,
      );
    }
  }

  function assertConfidence(
    value: number,
    field: string,
  ): void {
    assertFiniteNumber(value, field);

    if (value < 0 || value > 1) {
      throw new IntentValidationError(
        `${field} must be between 0 and 1`,
      );
    }
  }

  function assertNonNegativeInteger(
    value: number,
    field: string,
  ): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new IntentValidationError(
        `${field} must be a non-negative integer`,
      );
    }
  }

  function validateDate(
    value: string,
    field: string,
  ): void {
    if (!value) {
      throw new IntentValidationError(
        `${field} must not be empty`,
      );
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw new IntentValidationError(
        `${field} must be a valid ISO calendar date`,
      );
    }
  }

  function validateEvidence(
    evidence: { text: string; sourceStart?: number; sourceEnd?: number }[],
    field: string,
  ): void {
    for (const item of evidence) {
      if (!item.text.trim()) {
        throw new IntentValidationError(
          `${field}.evidence.text must not be empty`,
        );
      }

      if (item.sourceStart !== undefined) {
        assertNonNegativeInteger(
          item.sourceStart,
          `${field}.evidence.sourceStart`,
        );
      }

      if (item.sourceEnd !== undefined) {
        assertNonNegativeInteger(
          item.sourceEnd,
          `${field}.evidence.sourceEnd`,
        );
      }

      if (
        item.sourceStart !== undefined &&
        item.sourceEnd !== undefined &&
        item.sourceEnd < item.sourceStart
      ) {
        throw new IntentValidationError(
          `${field}.evidence.sourceEnd must be >= sourceStart`,
        );
      }
    }
  }

  function validateInterpretation<T>(
    interpretation: {
      value: T;
      confidence: number;
      evidence: {
        text: string;
        sourceStart?: number;
        sourceEnd?: number;
      }[];
    },
    field: string,
  ): void {
    assertConfidence(
      interpretation.confidence,
      `${field}.confidence`,
    );

    validateEvidence(
      interpretation.evidence,
      field,
    );
  }

  function validateEntities(
    intent: QueryIntent,
  ): void {
    const { entities } = intent;

    if (entities.location) {
      validateInterpretation(
        entities.location,
        "entities.location",
      );

      const { latitude, longitude } =
        entities.location.value;

      if (latitude !== undefined) {
        assertFiniteNumber(
          latitude,
          "entities.location.latitude",
        );
      }

      if (longitude !== undefined) {
        assertFiniteNumber(
          longitude,
          "entities.location.longitude",
        );
      }
    }

    if (entities.date) {
      validateInterpretation(
        entities.date,
        "entities.date",
      );

      const date = entities.date.value;

      if (date.value !== undefined) {
        validateDate(
          date.value,
          "entities.date.value",
        );
      }

      if (date.end !== undefined) {
        validateDate(
          date.end,
          "entities.date.end",
        );
      }

      if (
        date.value !== undefined &&
        date.end !== undefined &&
        date.end < date.value
      ) {
        throw new IntentValidationError(
          "entities.date.end must be >= entities.date.value",
        );
      }
    }

    if (entities.time) {
      validateInterpretation(
        entities.time,
        "entities.time",
      );
    }

    if (entities.budget) {
      validateInterpretation(
        entities.budget,
        "entities.budget",
      );

      const { min, max } =
        entities.budget.value;

      if (min !== undefined) {
        assertFiniteNumber(
          min,
          "entities.budget.min",
        );

        if (min < 0) {
          throw new IntentValidationError(
            "entities.budget.min must be >= 0",
          );
        }
      }

      if (max !== undefined) {
        assertFiniteNumber(
          max,
          "entities.budget.max",
        );

        if (max < 0) {
          throw new IntentValidationError(
            "entities.budget.max must be >= 0",
          );
        }
      }

      if (
        min !== undefined &&
        max !== undefined &&
        max < min
      ) {
        throw new IntentValidationError(
          "entities.budget.max must be >= entities.budget.min",
        );
      }
    }

    if (entities.people) {
      validateInterpretation(
        entities.people,
        "entities.people",
      );

      const people = entities.people.value;

      for (const [key, value] of Object.entries(
        people,
      )) {
        if (value !== undefined) {
          assertNonNegativeInteger(
            value,
            `entities.people.${key}`,
          );
        }
      }

      if (
        people.count !== undefined &&
        people.count < 1
      ) {
        throw new IntentValidationError(
          "entities.people.count must be >= 1",
        );
      }

      if (
        people.adults !== undefined &&
        people.children !== undefined &&
        people.count !== undefined &&
        people.adults + people.children >
          people.count
      ) {
        throw new IntentValidationError(
          "entities.people.adults + children cannot exceed count",
        );
      }
    }

    for (const [index, mood] of entities.moods.entries()) {
      validateInterpretation(
        mood,
        `entities.moods[${index}]`,
      );
    }

    for (const [
      index,
      activity,
    ] of entities.activities.entries()) {
      validateInterpretation(
        activity,
        `entities.activities[${index}]`,
      );
    }

    if (entities.relationship) {
      validateInterpretation(
        entities.relationship,
        "entities.relationship",
      );
    }

    if (entities.audience) {
      validateInterpretation(
        entities.audience,
        "entities.audience",
      );
    }
  }

  function validateFilter(
    filter: SearchFilter,
    index: number,
  ): void {
    if (!filter.field.trim()) {
      throw new IntentValidationError(
        `filters[${index}].field must not be empty`,
      );
    }

    if (
      filter.value === undefined ||
      filter.value === null
    ) {
      throw new IntentValidationError(
        `filters[${index}].value must be defined`,
      );
    }
  }

  export function validateQueryIntent(
    intent: QueryIntent,
  ): void {
    if (!intent.rawQuery.trim()) {
      throw new IntentValidationError(
        "rawQuery must not be empty",
      );
    }

    assertConfidence(
      intent.understanding.confidence,
      "understanding.confidence",
    );

    validateEntities(intent);

    validateEvidence(
      intent.understanding.evidence,
      "understanding",
    );

    for (const [index, ambiguity] of
      intent.understanding.ambiguities.entries()) {
      if (!ambiguity.field.trim()) {
        throw new IntentValidationError(
          `ambiguities[${index}].field must not be empty`,
        );
      }

      if (!ambiguity.description.trim()) {
        throw new IntentValidationError(
          `ambiguities[${index}].description must not be empty`,
        );
      }

      validateEvidence(
        ambiguity.evidence,
        `ambiguities[${index}]`,
      );
    }
  }

  export function validateSearchPlan(
    plan: SearchPlan,
  ): void {
    if (plan.providers.length === 0) {
      throw new IntentValidationError(
        "SearchPlan.providers must contain at least one provider",
      );
    }

    if (plan.clarification.required &&
        plan.clarification.fields.length === 0) {
      throw new IntentValidationError(
        "clarification.fields must identify at least one field when clarification is required",
      );
    }

    for (const [index, filter] of
      plan.filters.entries()) {
      validateFilter(filter, index);
    }
  }
