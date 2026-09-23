-- Milestone 2: database privilege hardening
--
-- Find iT exposes only the following client-side database operations:
--   anon SELECT on activities and activity_tags
--   anon INSERT on search_sessions and search_results
--
-- Migration 002 establishes those required privileges.
-- This migration removes broader table privileges that are not required
-- by the browser-facing application. Row Level Security remains enabled
-- on all four tables.

revoke
  references,
  trigger,
  truncate
on table
  public.activities,
  public.activity_tags,
  public.search_results,
  public.search_sessions
from anon, authenticated;
