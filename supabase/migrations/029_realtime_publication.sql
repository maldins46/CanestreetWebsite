-- Adds the tables the ledwall/showcase venue displays need low-latency pushes for
-- to the supabase_realtime publication. RLS is already public-read on all of these
-- (public site already reads them via the anon key), so anon subscribers get
-- exactly the rows they could already SELECT — no policy changes needed.
alter publication supabase_realtime add table ledwall_state;
alter publication supabase_realtime add table showcase_modes;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table tpc_entries;
alter publication supabase_realtime add table events;
