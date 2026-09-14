-- Milestone 1: public Data API permissions and anonymous telemetry inserts

grant select on table public.activities to anon;
grant select on table public.activity_tags to anon;

grant insert on table public.search_sessions to anon;
grant insert on table public.search_results to anon;

create policy "anon can create search sessions"
on public.search_sessions
for insert
to anon
with check (
  char_length(original_query) between 1 and 1000
  and (budget is null or budget >= 0)
  and (people is null or people > 0)
);

create policy "anon can create search results"
on public.search_results
for insert
to anon
with check (
  rank between 1 and 5
  and match_score >= 0
  and match_score <= 100
  and char_length(why_selected) between 1 and 1000
);