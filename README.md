# Milestone 1 — Intelligent Discovery Prototype

A prototype recommendation app that converts a natural-language activity request into ranked local recommendations.

## What it does

The app accepts requests such as:

> I have R300 and want something fun to do with my girlfriend Saturday.

It then:

1. Parses the request into structured search criteria.

2. Retrieves activity data from Supabase.

3. Applies hard filters such as budget, location, and explicit activity type.

4. Scores eligible activities using a deterministic rule-based recommendation engine.

5. Ranks the results.

6. Displays the top 5 recommendations.

7. Explains why each recommendation was selected.

8. Persists the search session and selected results in Supabase.

## Technology

- React

- TypeScript

- Vite

- Supabase

- PostgreSQL

- Git / GitHub

## Architecture

```text

Natural-language query

        |

        v

   Search parser

        |

        v

 Structured search criteria

        |

        v

 Supabase activities + tags

        |

        v

     Hard filters

        |

        v

   Rule-based scoring

        |

        v

     Ranked results

        |

        v

      Top 5 UI

        |

        +----> search_sessions

        |

        +----> search_results