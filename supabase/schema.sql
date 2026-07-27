-- ============================================================
-- Kid Tracker — Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email        text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role         text NOT NULL CHECK (role IN ('parent', 'kid')),
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  activity_date date NOT NULL,
  title         text NOT NULL,
  description   text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  expense_date date NOT NULL,
  amount       numeric NOT NULL CHECK (amount > 0),
  category     text NOT NULL,
  note         text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  assigned_by       uuid REFERENCES profiles,
  title             text NOT NULL,
  description       text,
  priority          text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  points            integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  status            text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'approved', 'rejected')),
  deadline          date,
  completed_at      timestamptz,
  rejection_comment text,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES profiles,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id    uuid NOT NULL REFERENCES rewards ON DELETE CASCADE,
  kid_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  fulfilled_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select"  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- activities
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activities_update" ON activities FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "activities_delete" ON activities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- expenses
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- tasks (parents assign; kids mark complete; both update status)
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

-- rewards
CREATE POLICY "rewards_select" ON rewards FOR SELECT TO authenticated USING (true);
CREATE POLICY "rewards_insert" ON rewards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rewards_update" ON rewards FOR UPDATE TO authenticated USING (true);

-- redemptions
CREATE POLICY "redemptions_select" ON redemptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "redemptions_insert" ON redemptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "redemptions_update" ON redemptions FOR UPDATE TO authenticated USING (true);

-- ── Auto-create profile on signup ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'kid')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Seed starter rewards (optional) ──────────────────────────
-- Uncomment to insert default rewards after creating a parent account
-- and replace <your-parent-uuid> with the parent user's ID.

-- INSERT INTO rewards (title, description, points_cost, is_active, created_by) VALUES
--   ('Ice Cream',    'A scoop of your choice',           100, true, '<your-parent-uuid>'),
--   ('Movie Night',  'Pick any movie to watch together', 300, true, '<your-parent-uuid>'),
--   ('New Toy',      'Any toy up to $20',                600, true, '<your-parent-uuid>');
