-- Create public bucket named 'post-images' (id and name must match)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload (INSERT)
create policy "Authenticated users can upload to post-images"
on storage.objects
for insert
to authenticated
with check (
  auth.role() = 'authenticated' and bucket_id = 'post-images'
);

-- Policy: Allow authenticated users to update (UPDATE)
create policy "Authenticated users can update post-images"
on storage.objects
for update
to authenticated
using (
  auth.role() = 'authenticated' and bucket_id = 'post-images'
)
with check (
  auth.role() = 'authenticated' and bucket_id = 'post-images'
);

-- Policy: Allow anyone (public) to view (SELECT)
create policy "Anyone can view post-images"
on storage.objects
for select
to public
using (
  bucket_id = 'post-images'
);

-- Policy: Allow only admins to delete (DELETE)
create policy "Admins can delete post-images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and exists (
    select 1 from public.user_profiles
    where user_profiles.user_id = auth.uid()
    and user_profiles.role = 'admin'
  )
);
