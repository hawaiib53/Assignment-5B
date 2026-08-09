-- Receipt upload support for the "Receipt" dropzone on the submission form.

alter table expenses add column receipt_path text;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

create policy "Authenticated users can read receipts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');
