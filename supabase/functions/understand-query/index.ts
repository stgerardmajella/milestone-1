const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const queryIntentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
      enum: ["events", "activities", "places", "web"],
    },
    intent: {
      type: "string",
    },
    location: {
      type: ["string", "null"],
    },
    dateRange: {
      type: "object",
      additionalProperties: false,
      properties: {
        from: {
          type: ["string", "null"],
        },
        to: {
          type: ["string", "null"],
        },
      },
      required: ["from", "to"],
    },
    timeRange: {
      type: "object",
      additionalProperties: false,
      properties: {
        from: {
          type: ["string", "null"],
        },
        to: {
          type: ["string", "null"],
        },
      },
      required: ["from", "to"],
    },
    people: {
      type: ["number", "null"],
    },
    audience: {
      type: ["string", "null"],
    },
    budget: {
      type: "object",
      additionalProperties: false,
      properties: {
        max: {
          type: ["number", "null"],
        },
        currency: {
          type: "string",
          enum: ["ZAR"],
        },
      },
      required: ["max", "currency"],
    },
    preferences: {
      type: "array",
      items: {
        type: "string",
      },
    },
    keywords: {
      type: "array",
      items: {
        type: "string",
      },
    },
    constraints: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "category",
    "intent",
    "location",
    "dateRange",
    "timeRange",
    "people",
    "audience",
    "budget",
    "preferences",
    "keywords",
    "constraints",
  ],
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const body = await req.json();

    if (
      !body ||
      typeof body.query !== "string" ||
      body.query.trim().length === 0
    ) {
      return jsonResponse(
        {
          error:
            "Request body must contain a non-empty string field named query",
        },
        400,
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured");

      return jsonResponse(
        {
          error: "Server configuration error",
        },
        500,
      );
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: [
            {
              role: "system",
              content:
                "You are the travel query understanding service for a South African travel discovery application. Extract the user's query into the QueryIntent contract. Do not invent facts. Use null for unknown scalar values, empty arrays for absent lists, and preserve the user's meaning. Budget currency must always be ZAR.",
            },
            {
              role: "user",
              content: body.query.trim(),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "query_intent",
              strict: true,
              schema: queryIntentSchema,
            },
          },
        }),
      },
    );

    if (!openAIResponse.ok) {
      const providerStatus = openAIResponse.status;
      const providerBody = await openAIResponse.text();

      console.error(
        "OpenAI Responses API error:",
        providerStatus,
        providerBody,
      );

      let providerMessage = "Provider request failed";
      let providerCode: string | null = null;
      let providerType: string | null = null;

      try {
        const parsedProviderBody = JSON.parse(providerBody);

        if (
          parsedProviderBody &&
          typeof parsedProviderBody.error === "object" &&
          parsedProviderBody.error !== null
        ) {
          if (typeof parsedProviderBody.error.message === "string") {
            providerMessage = parsedProviderBody.error.message;
          }

          if (typeof parsedProviderBody.error.code === "string") {
            providerCode = parsedProviderBody.error.code;
          }

          if (typeof parsedProviderBody.error.type === "string") {
            providerType = parsedProviderBody.error.type;
          }
        }
      } catch {
        // Preserve the generic provider message when the upstream body is not JSON.
      }

      const isQuotaExhausted =
        providerCode === "credit_balance_exhausted" ||
        providerType === "insufficient_quota";

      const errorCode = isQuotaExhausted
        ? "QUOTA_EXHAUSTED"
        : providerStatus === 429
          ? "RATE_LIMIT"
          : "PROVIDER_ERROR";

      const retryable = errorCode === "RATE_LIMIT";

      return jsonResponse(
        {
          success: false,
          data: [],
          error: {
            code: errorCode,
            message: providerMessage,
            retryable,
          },
          metadata: {
            provider: "understand-query",
            requestId: openAIResponse.headers.get("x-request-id"),
            retrievedAt: new Date().toISOString(),
            latencyMs: 0,
            usage: {
              inputUnits: null,
              outputUnits: null,
              requests: 1,
            },
            estimatedCostZar: null,
          },
        },
        200,
      );
    }

    const response = await openAIResponse.json();

    const output = response.output
      ?.find((item: { type?: string }) => item.type === "message")
      ?.content?.find(
        (item: { type?: string }) => item.type === "output_text",
      )
      ?.text;

    if (typeof output !== "string" || output.length === 0) {
      console.error("OpenAI returned no structured output");

      return jsonResponse(
        {
          error: "Provider returned no structured output",
        },
        502,
      );
    }

    let intent: unknown;

    try {
      intent = JSON.parse(output);
    } catch {
      console.error("OpenAI returned invalid JSON");

      return jsonResponse(
        {
          error: "Provider returned invalid structured data",
        },
        502,
      );
    }

    return jsonResponse(
      {
        intent,
      },
      200,
    );
  } catch (error) {
    console.error("understand-query error:", error);

    return jsonResponse(
      {
        error: "Unable to process query",
      },
      500,
    );
  }
});