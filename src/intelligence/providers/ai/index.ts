import type OpenAI from 'openai'
import type {
  AIProvider,
  ProviderResult,
  QueryIntent,
} from '../../contracts'

type OpenAIClient = Pick<OpenAI, 'responses'>

const queryIntentSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: ['events', 'activities', 'places', 'web'],
    },
    intent: {
      type: 'string',
    },
    location: {
      type: ['string', 'null'],
    },
    dateRange: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: {
          type: ['string', 'null'],
        },
        to: {
          type: ['string', 'null'],
        },
      },
      required: ['from', 'to'],
    },
    timeRange: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: {
          type: ['string', 'null'],
        },
        to: {
          type: ['string', 'null'],
        },
      },
      required: ['from', 'to'],
    },
    people: {
      type: ['number', 'null'],
    },
    audience: {
      type: ['string', 'null'],
    },
    budget: {
      type: 'object',
      additionalProperties: false,
      properties: {
        max: {
          type: ['number', 'null'],
        },
        currency: {
          type: 'string',
          enum: ['ZAR'],
        },
      },
      required: ['max', 'currency'],
    },
    preferences: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    keywords: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    constraints: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: [
    'category',
    'intent',
    'location',
    'dateRange',
    'timeRange',
    'people',
    'audience',
    'budget',
    'preferences',
    'keywords',
    'constraints',
  ],
} as const

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAIClient

  constructor(client: OpenAIClient) {
    this.client = client
  }

  async understandQuery(
    query: string,
  ): Promise<ProviderResult<QueryIntent>> {
    const startedAt = Date.now()

    try {
      const response = await this.client.responses.create({
        model: 'gpt-5.6-luna',
        store: false,
        input: [
          {
            role: 'system',
            content:
              'You are the query-understanding component of an activity discovery application. Convert the user request into the supplied QueryIntent structure. Extract only information supported by the user request. Use null when a value is not provided. The currency is always ZAR.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'query_intent',
            strict: true,
            schema: queryIntentSchema,
          },
        },
      })

      if (!response.output_text) {
        return {
          success: false,
          data: [],
          error: {
            code: 'INVALID_RESPONSE',
            message: 'OpenAI returned an empty response.',
            retryable: false,
          },
          metadata: {
            provider: 'openai',
            requestId: response.id ?? null,
            retrievedAt: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
            usage: {
              inputUnits: response.usage?.input_tokens ?? null,
              outputUnits: response.usage?.output_tokens ?? null,
              requests: 1,
            },
            estimatedCostZar: null,
          },
        }
      }

      const intent = JSON.parse(response.output_text) as QueryIntent

      return {
        success: true,
        data: [intent],
        error: null,
        metadata: {
          provider: 'openai',
          requestId: response.id ?? null,
          retrievedAt: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
          usage: {
            inputUnits: response.usage?.input_tokens ?? null,
            outputUnits: response.usage?.output_tokens ?? null,
            requests: 1,
          },
          estimatedCostZar: null,
        },
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: {
          code: 'PROVIDER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'OpenAI request failed.',
          retryable: true,
        },
        metadata: {
          provider: 'openai',
          requestId: null,
          retrievedAt: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
          usage: {
            inputUnits: null,
            outputUnits: null,
            requests: 1,
          },
          estimatedCostZar: null,
        },
      }
    }
  }
}