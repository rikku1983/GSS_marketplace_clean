CREATE TABLE public.email_whitelist (
  email_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  added_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT email_whitelist_pkey PRIMARY KEY (email_id)
);
CREATE TABLE public.user_profiles (
  user_id uuid NOT NULL,
  user_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  location character varying,
  role character varying DEFAULT 'member'::character varying CHECK (role::text = ANY (ARRAY['member'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_email_fkey FOREIGN KEY (email) REFERENCES email_whitelist(email)
);
CREATE TABLE public.marketplace_posts (
  post_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title character varying NOT NULL,
  description text,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['skates-and-blades'::character varying, 'protective-gear'::character varying, 'clothing'::character varying, 'accessories'::character varying, 'training-equipment'::character varying, 'other'::character varying]::text[])),
  brand character varying,
  size numeric,
  condition character varying NOT NULL CHECK (condition::text = ANY (ARRAY['new'::character varying, 'like-new'::character varying, 'good'::character varying, 'fair'::character varying, 'poor'::character varying]::text[])),
  price numeric NOT NULL,
  contact_method character varying NOT NULL,
  user_id uuid NOT NULL,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying, 'pending'::character varying, 'sold'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_url text,
  photos_count integer DEFAULT 0,
  CONSTRAINT marketplace_posts_pkey PRIMARY KEY (post_id),
  CONSTRAINT marketplace_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
);
CREATE TABLE public.post_images (
  image_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  post_id bigint NOT NULL,
  filename character varying NOT NULL,
  original_name character varying,
  file_size integer,
  mime_type character varying,
  storage_path text,
  created_at timestamp with time zone DEFAULT now(),
  display_order integer DEFAULT 0,
  width integer,
  height integer,
  CONSTRAINT post_images_pkey PRIMARY KEY (image_id),
  CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.marketplace_posts(post_id)
);

