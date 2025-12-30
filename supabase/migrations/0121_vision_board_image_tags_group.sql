-- Add category grouping for vision board image tags
alter table public.vision_board_image_tags
  add column if not exists category_group text not null default 'life_wheel';

update public.vision_board_image_tags
set category_group = 'life_wheel'
where category_group is null;

alter table public.vision_board_image_tags
  drop constraint if exists vision_board_image_tags_pkey;

alter table public.vision_board_image_tags
  add primary key (image_id, category_group, category_key);

drop index if exists idx_vision_board_image_tags_user_category;

create index if not exists idx_vision_board_image_tags_user_group
  on public.vision_board_image_tags (user_id, category_group, category_key);
