-- ============================================================
-- GSS Marketplace Database Schema
-- Run this entire file in the Supabase SQL Editor on a fresh project.
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE public.email_whitelist (
  email_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  added_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
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
  CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_profiles_email_fkey FOREIGN KEY (email) REFERENCES email_whitelist(email)
);

CREATE TABLE public.marketplace_posts (
  post_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title character varying NOT NULL,
  description text,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['skates-and-blades'::character varying, 'protective-gear'::character varying, 'clothing'::character varying, 'accessories'::character varying, 'training-equipment'::character varying, 'other'::character varying]::text[])),
  brand character varying,
  size character varying,
  condition character varying NOT NULL CHECK (condition::text = ANY (ARRAY['new'::character varying, 'like-new'::character varying, 'good'::character varying, 'fair'::character varying, 'poor'::character varying]::text[])),
  price numeric NOT NULL CHECK (price >= 0),
  contact_method character varying NOT NULL,
  user_id uuid NOT NULL,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying, 'pending'::character varying, 'sold'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_url text,
  photos_count integer DEFAULT 0 CHECK (photos_count >= 0),
  CONSTRAINT marketplace_posts_pkey PRIMARY KEY (post_id),
  CONSTRAINT marketplace_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE
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
  CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.marketplace_posts(post_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- UPDATED_AT AUTO-TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.email_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.marketplace_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.email_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

-- email_whitelist: anyone can read (needed for registration check), only admins can write
CREATE POLICY "Public can read whitelist" ON public.email_whitelist
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage whitelist" ON public.email_whitelist
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- user_profiles: authenticated can read all, users manage own, admins manage all
CREATE POLICY "Authenticated can read profiles" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete profiles" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- marketplace_posts: public can read, authenticated can insert, owners/admins can modify
CREATE POLICY "Public can read posts" ON public.marketplace_posts
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can create posts" ON public.marketplace_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update posts" ON public.marketplace_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Owners and admins can delete posts" ON public.marketplace_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- post_images: public can read, authenticated can insert, owners/admins can delete
CREATE POLICY "Public can read images" ON public.post_images
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert images" ON public.post_images
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Owners and admins can delete images" ON public.post_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.marketplace_posts WHERE post_id = post_images.post_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
