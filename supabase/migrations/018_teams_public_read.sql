-- Allow public to read approved teams (needed for tournament display joins)
create policy "teams_public_read_approved"
  on teams for select
  using (status = 'approved');
