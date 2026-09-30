import type {
    Activity,
    Audience,
    BudgetIntent,
    Evidence,
    IntentCategory,
    IntentType,
    LocationIntent,
    Mood,
    PeopleIntent,
    QueryIntent,
    Relationship,
  } from "./contracts";
  
  function createEvidence(text: string): Evidence {
    return {
      text,
    };
  }
  
  function createInterpretation<T>(
    value: T,
    evidenceText: string,
    source: "explicit" | "inferred" | "default" | "unknown",
    confidence: number,
  ) {
    return {
      value,
      source,
      confidence,
      evidence: [createEvidence(evidenceText)],
    };
  }
  
  function detectIntentType(query: string): IntentType {
    const lowerQuery = query.toLowerCase().trim();
  
    // "What is happening..." means event discovery in Intent Engine v1.
    if (
      /\bwhat\s+is\s+happening\b/i.test(lowerQuery) ||
      /\bwhat's\s+happening\b/i.test(lowerQuery)
    ) {
      return "discovery";
    }
  
    const informationPatterns = [
      /^what is\b/,
      /^what are\b/,
      /^what does\b/,
      /^what time\b/,
      /^how much\b/,
      /^how many\b/,
      /^where is\b/,
      /^where are\b/,
      /^how does\b/,
      /^why does\b/,
      /^why is\b/,
    ];
  
    if (informationPatterns.some((pattern) => pattern.test(lowerQuery))) {
      return "information";
    }
  
    return "discovery";
  }
  
  function detectCategory(query: string): IntentCategory {
    const lowerQuery = query.toLowerCase();
  
    if (
      /\bwhat\s+is\s+happening\b/.test(lowerQuery) ||
      /\bwhat's\s+happening\b/.test(lowerQuery)
    ) {
      return "events";
    }
  
    const eventTerms = [
      "event",
      "events",
      "concert",
      "concerts",
      "festival",
      "festivals",
      "gig",
      "gigs",
      "show",
      "shows",
    ];
  
    if (eventTerms.some((term) => lowerQuery.includes(term))) {
      return "events";
    }
  
    if (
      lowerQuery.includes("place") ||
      lowerQuery.includes("places") ||
      lowerQuery.includes("restaurant") ||
      lowerQuery.includes("restaurants") ||
      lowerQuery.includes("where to eat")
    ) {
      return "places";
    }
  
    if (
      lowerQuery.includes("activity") ||
      lowerQuery.includes("activities") ||
      lowerQuery.includes("things to do")
    ) {
      return "activities";
    }
  
    if (detectIntentType(query) === "information") {
      return "web";
    }
  
    return "all";
  }
  
  function detectLocation(
    query: string,
  ): QueryIntent["entities"]["location"] {
    const locations: Array<{
      match: string;
      location: LocationIntent;
    }> = [
      {
        match: "cape town",
        location: {
          city: "Cape Town",
        },
      },
      {
        match: "johannesburg",
        location: {
          city: "Johannesburg",
        },
      },
      {
        match: "durban",
        location: {
          city: "Durban",
        },
      },
      {
        match: "pretoria",
        location: {
          city: "Pretoria",
        },
      },
      {
        match: "sea point",
        location: {
          suburb: "Sea Point",
        },
      },
      {
        match: "v&a waterfront",
        location: {
          text: "V&A Waterfront",
        },
      },
    ];
  
    const lowerQuery = query.toLowerCase();
  
    const explicitMatches = locations
      .map((entry) => ({
        ...entry,
        index: lowerQuery.indexOf(entry.match),
      }))
      .filter((entry) => entry.index >= 0)
      .sort((a, b) => a.index - b.index);
  
    if (explicitMatches.length > 0) {
      const match = explicitMatches[0];
  
      return createInterpretation(
        match.location,
        query.slice(match.index, match.index + match.match.length),
        "explicit",
        1,
      );
    }
  
    const nearMeMatch = /\bnear me\b/i.exec(query);
  
    if (nearMeMatch) {
      return createInterpretation(
        {
          text: "near me",
        },
        nearMeMatch[0],
        "explicit",
        1,
      );
    }
  
    return undefined;
  }
  
  function detectDate(
    query: string,
  ): QueryIntent["entities"]["date"] {
    const rangePatterns: Array<{
      pattern: RegExp;
      transform: (match: RegExpExecArray) => string;
    }> = [
      {
        pattern:
          /\bfrom\s+(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)\s+to\s+(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)\b/i,
        transform: (match) => `${match[1]} to ${match[2]}`,
      },
      {
        pattern:
          /\bbetween\s+(\d{1,2})\s+and\s+(\d{1,2})\s+([A-Za-z]+)\b/i,
        transform: (match) => `${match[1]} to ${match[2]} ${match[3]}`,
      },
      {
        pattern:
          /\b(\d{1,2})\s+to\s+(\d{1,2})\s+([A-Za-z]+)\b/i,
        transform: (match) => `${match[1]} to ${match[2]} ${match[3]}`,
      },
    ];
  
    for (const entry of rangePatterns) {
      const match = entry.pattern.exec(query);
  
      if (match) {
        const relative = entry.transform(match);
  
        return createInterpretation(
          {
            relative,
          },
          match[0],
          "explicit",
          1,
        );
      }
    }
  
    const relativePatterns = [
      /\bthis\s+weekend\b/i,
      /\bthis\s+(Saturday|Sunday|Friday|Monday|Tuesday|Wednesday|Thursday)\b/i,
      /\bnext\s+(Saturday|Sunday|Friday|Monday|Tuesday|Wednesday|Thursday)\b/i,
      /\btomorrow\b/i,
      /\btoday\b/i,
      /\btonight\b/i,
    ];
  
    for (const pattern of relativePatterns) {
      const match = pattern.exec(query);
  
      if (match) {
        return createInterpretation(
          {
            relative: match[0],
          },
          match[0],
          "explicit",
          1,
        );
      }
    }
  
    const weekdayMatch =
      /\b(Saturday|Sunday|Friday|Monday|Tuesday|Wednesday|Thursday)\b/i.exec(
        query,
      );
  
    if (weekdayMatch) {
      return createInterpretation(
        {
          relative: weekdayMatch[0],
        },
        weekdayMatch[0],
        "explicit",
        1,
      );
    }
  
    return undefined;
  }
  
  function detectTime(
    query: string,
  ): QueryIntent["entities"]["time"] {
    const lowerQuery = query.toLowerCase();
  
    if (/\btonight\b/.test(lowerQuery)) {
      return createInterpretation(
        {
          periods: ["evening", "night"],
        },
        "tonight",
        "explicit",
        1,
      );
    }
  
    const clockMatch =
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(query);
  
    if (clockMatch) {
      let hour = Number(clockMatch[1]);
      const minutes = Number(clockMatch[2] ?? "00");
      const meridiem = clockMatch[3].toLowerCase();
  
      if (meridiem === "pm" && hour !== 12) {
        hour += 12;
      }
  
      if (meridiem === "am" && hour === 12) {
        hour = 0;
      }
  
      const value = `${String(hour).padStart(2, "0")}:${String(
        minutes,
      ).padStart(2, "0")}`;
  
      return createInterpretation(
        {
          value,
        },
        clockMatch[0],
        "explicit",
        1,
      );
    }
  
    const periods: Array<{
      match: string;
      period: "morning" | "afternoon" | "evening" | "night";
    }> = [
      {
        match: "morning",
        period: "morning",
      },
      {
        match: "afternoon",
        period: "afternoon",
      },
      {
        match: "evening",
        period: "evening",
      },
      {
        match: "night",
        period: "night",
      },
    ];
  
    for (const entry of periods) {
      if (lowerQuery.includes(entry.match)) {
        return createInterpretation(
          {
            period: entry.period,
          },
          entry.match,
          "explicit",
          1,
        );
      }
    }
  
    return undefined;
  }
  
  function parseNumberWord(value: string): number | undefined {
    const numbers: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };
  
    if (numbers[value.toLowerCase()] !== undefined) {
      return numbers[value.toLowerCase()];
    }
  
    const numeric = Number(value);
  
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  
  function detectBudget(
    query: string,
  ): QueryIntent["entities"]["budget"] {
    const freeMatch = /\bfree\b/i.exec(query);
  
    if (freeMatch) {
      const value: BudgetIntent = {
        max: 0,
        currency: "ZAR",
      };
  
      return createInterpretation(
        value,
        freeMatch[0],
        "explicit",
        1,
      );
    }
  
    const rangeMatch =
      /\bbetween\s+R?\s*([\d,]+)\s+and\s+R?\s*([\d,]+)\b/i.exec(
        query,
      );
  
    if (rangeMatch) {
      const min = Number(rangeMatch[1].replace(/,/g, ""));
      const max = Number(rangeMatch[2].replace(/,/g, ""));
  
      if (Number.isFinite(min) && Number.isFinite(max)) {
        const value: BudgetIntent = {
          min,
          max,
          currency: "ZAR",
        };
  
        return createInterpretation(
          value,
          rangeMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    const maxMatch =
      /\b(under|up to|below|less than)\s+R?\s*([\d,]+)\b/i.exec(
        query,
      );
  
    if (maxMatch) {
      const max = Number(maxMatch[2].replace(/,/g, ""));
  
      if (Number.isFinite(max)) {
        const value: BudgetIntent = {
          max,
          currency: "ZAR",
        };
  
        return createInterpretation(
          value,
          maxMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    return undefined;
  }
  
  function detectPeople(
    query: string,
  ): QueryIntent["entities"]["people"] {
    const lowerQuery = query.toLowerCase();
  
    const adultsChildrenMatch =
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+adults?\s+(?:and|&)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:children|kids?)\b/i.exec(
        query,
      );
  
    if (adultsChildrenMatch) {
      const adults = parseNumberWord(adultsChildrenMatch[1]);
      const children = parseNumberWord(adultsChildrenMatch[2]);
  
      if (adults !== undefined && children !== undefined) {
        const value: PeopleIntent = {
          count: adults + children,
          adults,
          children,
        };
  
        return createInterpretation(
          value,
          adultsChildrenMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    const familyMatch =
      /\bfamily\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(
        query,
      );
  
    if (familyMatch) {
      const count = parseNumberWord(familyMatch[1]);
  
      if (count !== undefined) {
        return createInterpretation(
          {
            count,
          },
          familyMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    const peopleMatch =
      /\b(?:for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+people\b/i.exec(
        query,
      );
  
    if (peopleMatch) {
      const count = parseNumberWord(peopleMatch[1]);
  
      if (count !== undefined) {
        return createInterpretation(
          {
            count,
          },
          peopleMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    const forNumberMatch =
      /\bfor\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(
        query,
      );
  
    if (forNumberMatch) {
      const count = parseNumberWord(forNumberMatch[1]);
  
      if (count !== undefined) {
        return createInterpretation(
          {
            count,
          },
          forNumberMatch[0],
          "explicit",
          1,
        );
      }
    }
  
    // Prevent accidental inference from unrelated words such as "four" in names.
    if (lowerQuery.includes("for two")) {
      return createInterpretation(
        {
          count: 2,
        },
        "for two",
        "explicit",
        1,
      );
    }
  
    return undefined;
  }
  
  function detectRelationship(
    query: string,
  ): QueryIntent["entities"]["relationship"] {
    const lowerQuery = query.toLowerCase();
  
    const explicitRelationships: Array<{
      patterns: string[];
      value: Relationship;
    }> = [
      {
        patterns: [
          "girlfriend",
          "boyfriend",
          "partner",
          "wife",
          "husband",
        ],
        value: "romantic",
      },
      {
        patterns: ["friends", "friend group"],
        value: "friends",
      },
      {
        patterns: ["family"],
        value: "family",
      },
      {
        patterns: ["alone", "by myself", "solo"],
        value: "solo",
      },
    ];
  
    for (const entry of explicitRelationships) {
      const matched = entry.patterns.find((pattern) =>
        lowerQuery.includes(pattern),
      );
  
      if (matched) {
        return createInterpretation(
          entry.value,
          matched,
          "explicit",
          1,
        );
      }
    }
  
    if (lowerQuery.includes("date night")) {
      return createInterpretation(
        "romantic",
        "date night",
        "inferred",
        0.95,
      );
    }
  
    if (/\bfor\s+a\s+date\b/.test(lowerQuery)) {
      return createInterpretation(
        "romantic",
        "for a date",
        "inferred",
        0.95,
      );
    }
  
    return undefined;
  }
  
  function detectAudience(
    query: string,
  ): QueryIntent["entities"]["audience"] {
    const lowerQuery = query.toLowerCase();
  
    let audience: Audience | undefined;
  
    if (
      lowerQuery.includes("family") ||
      lowerQuery.includes("families") ||
      lowerQuery.includes("kids") ||
      lowerQuery.includes("children")
    ) {
      audience = "family";
    } else if (
      lowerQuery.includes("friends") ||
      lowerQuery.includes("friend group")
    ) {
      audience = "friends";
    } else if (
      lowerQuery.includes("girlfriend") ||
      lowerQuery.includes("boyfriend") ||
      lowerQuery.includes("partner") ||
      lowerQuery.includes("wife") ||
      lowerQuery.includes("husband")
    ) {
      audience = "couple";
    } else if (
      lowerQuery.includes("alone") ||
      lowerQuery.includes("by myself") ||
      lowerQuery.includes("solo")
    ) {
      audience = "solo";
    }
  
    if (!audience) {
      return undefined;
    }
  
    return createInterpretation(
      audience,
      query,
      "explicit",
      1,
    );
  }
  
  function detectMoods(
    query: string,
  ): QueryIntent["entities"]["moods"] {
    const lowerQuery = query.toLowerCase();
  
    const moodPatterns: Array<{
      match: string;
      mood: Mood;
    }> = [
      { match: "fun", mood: "fun" },
      { match: "romantic", mood: "romantic" },
      { match: "outdoor", mood: "outdoor" },
      { match: "outdoors", mood: "outdoor" },
      { match: "outside", mood: "outdoor" },
      { match: "family", mood: "family" },
      { match: "adventure", mood: "adventure" },
      { match: "adventurous", mood: "adventure" },
      { match: "relaxing", mood: "relaxing" },
      { match: "relaxed", mood: "relaxing" },
      { match: "chill", mood: "relaxing" },
      { match: "nightlife", mood: "nightlife" },
      { match: "date night", mood: "date_night" },
    ];
  
    const hits: Array<{
      index: number;
      match: string;
      mood: Mood;
    }> = [];
  
    for (const entry of moodPatterns) {
      const index = lowerQuery.indexOf(entry.match);
  
      if (index >= 0) {
        if (!hits.some((hit) => hit.mood === entry.mood)) {
          hits.push({
            index,
            match: entry.match,
            mood: entry.mood,
          });
        }
      }
    }
  
    return hits
      .sort((a, b) => a.index - b.index)
      .map((hit) =>
        createInterpretation(
          hit.mood,
          hit.match,
          "explicit",
          1,
        ),
      );
  }
  
  function detectActivities(
    query: string,
  ): QueryIntent["entities"]["activities"] {
    const lowerQuery = query.toLowerCase();
  
    const activityPatterns: Array<{
      match: string;
      activity: Activity;
    }> = [
      { match: "food", activity: "food" },
      { match: "eat", activity: "food" },
      { match: "live music", activity: "live_music" },
      { match: "pool table", activity: "pool_table" },
      { match: "play pool", activity: "pool_table" },
      { match: "pool", activity: "pool_table" },
      { match: "swimming pool", activity: "swimming_pool" },
      { match: "bowling", activity: "bowling" },
      { match: "movies", activity: "movies" },
      { match: "movie", activity: "movies" },
      { match: "gaming", activity: "gaming" },
      { match: "games", activity: "gaming" },
      { match: "hiking", activity: "hiking" },
      { match: "beach", activity: "beach" },
    ];
  
    const hits: Array<{
      index: number;
      match: string;
      activity: Activity;
    }> = [];
  
    for (const entry of activityPatterns) {
      const index = lowerQuery.indexOf(entry.match);
  
      if (index >= 0) {
        if (!hits.some((hit) => hit.activity === entry.activity)) {
          hits.push({
            index,
            match: entry.match,
            activity: entry.activity,
          });
        }
      }
    }
  
    return hits
      .sort((a, b) => a.index - b.index)
      .map((hit) =>
        createInterpretation(
          hit.activity,
          hit.match,
          "explicit",
          1,
        ),
      );
  }
  
  function detectKeywords(query: string): string[] {
    const keywords: Array<{
      match: string;
      value: string;
    }> = [
      {
        match: "v&a waterfront",
        value: "V&A Waterfront",
      },
      {
        match: "kirstenbosch",
        value: "Kirstenbosch",
      },
      {
        match: "two oceans aquarium",
        value: "Two Oceans Aquarium",
      },
      {
        match: "date night",
        value: "date night",
      },
      {
        match: "nice",
        value: "nice",
      },
    ];
  
    const lowerQuery = query.toLowerCase();
  
    return keywords
      .filter((entry) => lowerQuery.includes(entry.match))
      .sort(
        (a, b) =>
          lowerQuery.indexOf(a.match) -
          lowerQuery.indexOf(b.match),
      )
      .map((entry) => entry.value);
  }
  
  function detectAmbiguities(
    query: string,
  ): QueryIntent["understanding"]["ambiguities"] {
    const lowerQuery = query.toLowerCase();
    const ambiguities: QueryIntent["understanding"]["ambiguities"] =
      [];
  
    if (/\bnear\s+the\s+city\b/.test(lowerQuery)) {
      ambiguities.push({
        field: "location",
        description:
          "The phrase 'near the city' does not identify a specific city.",
        evidence: [createEvidence("near the city")],
      });
    }
  
    if (/\bgroup\b/.test(lowerQuery)) {
      ambiguities.push({
        field: "people",
        description:
          "The query identifies a group but does not specify its size.",
        evidence: [createEvidence("group")],
      });
    }
  
    return ambiguities;
  }
  
  export function interpretQuery(query: string): QueryIntent {
    const trimmedQuery = query.trim();
  
    const relationship = detectRelationship(trimmedQuery);
  
    return {
      rawQuery: trimmedQuery,
      intentType: detectIntentType(trimmedQuery),
      category: detectCategory(trimmedQuery),
      entities: {
        location: detectLocation(trimmedQuery),
        date: detectDate(trimmedQuery),
        time: detectTime(trimmedQuery),
        budget: detectBudget(trimmedQuery),
        people: detectPeople(trimmedQuery),
        relationship,
        audience: detectAudience(trimmedQuery),
        moods: detectMoods(trimmedQuery),
        activities: detectActivities(trimmedQuery),
      },
      semantics: {
        preferences: [],
        keywords: detectKeywords(trimmedQuery),
        constraints: [],
      },
      understanding: {
        confidence: 0,
        ambiguities: detectAmbiguities(trimmedQuery),
        evidence: [],
      },
    };
  }