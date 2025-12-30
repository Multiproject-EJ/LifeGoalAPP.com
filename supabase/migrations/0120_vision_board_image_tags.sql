-- Add category tagging for vision board images
create table if not exists public.vision_board_image_tags (
  image_id uuid not null references public.vision_images (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_key text not null,
  created_at timestamptz not null default now(),
  primary key (image_id, category_key)
);

create index if not exists idx_vision_board_image_tags_user_category
  on public.vision_board_image_tags (user_id, category_key);

create index if not exists idx_vision_board_image_tags_image
  on public.vision_board_image_tags (image_id);

alter table public.vision_board_image_tags enable row level security;

create policy vision_board_image_tags_select on public.vision_board_image_tags
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.vision_images i
      where i.id = image_id and i.user_id = auth.uid()
    )
  );

create policy vision_board_image_tags_insert on public.vision_board_image_tags
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.vision_images i
      where i.id = image_id and i.user_id = auth.uid()
    )
  );

create policy vision_board_image_tags_delete on public.vision_board_image_tags
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.vision_images i
      where i.id = image_id and i.user_id = auth.uid()
    )
  );
