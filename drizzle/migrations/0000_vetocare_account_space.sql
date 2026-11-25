CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  species text NOT NULL DEFAULT '',
  species_label text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT '',
  level_label text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  limit_seconds integer NOT NULL DEFAULT 0,
  timed_out boolean NOT NULL DEFAULT false,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  played_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own quiz select" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own quiz insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own quiz update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own quiz delete" ON public.quiz_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX quiz_attempts_user_played_idx ON public.quiz_attempts (user_id, played_at DESC);

CREATE TABLE public.course_progress (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id text NOT NULL,
  chapter_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  favorite boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_progress TO authenticated;
GRANT ALL ON public.course_progress TO service_role;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress select" ON public.course_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own progress insert" ON public.course_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress update" ON public.course_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress delete" ON public.course_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER course_progress_touch BEFORE UPDATE ON public.course_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  note numeric(4,2) NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own exam select" ON public.exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own exam insert" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own exam delete" ON public.exam_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX exam_attempts_user_idx ON public.exam_attempts (user_id, created_at DESC);

CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  species text NOT NULL DEFAULT '',
  birth_date date,
  notes text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pets select" ON public.pets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own pets insert" ON public.pets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own pets update" ON public.pets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own pets delete" ON public.pets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX pets_user_idx ON public.pets (user_id);

CREATE TABLE public.pet_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'autre',
  due_date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  time_zone text NOT NULL DEFAULT 'Africa/Kinshasa',
  notified_eve boolean NOT NULL DEFAULT false,
  notified_day boolean NOT NULL DEFAULT false,
  pet_label text NOT NULL DEFAULT '',
  remind_hour integer CHECK (remind_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_reminders TO authenticated;
GRANT ALL ON public.pet_reminders TO service_role;
ALTER TABLE public.pet_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reminders select" ON public.pet_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own reminders insert" ON public.pet_reminders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (pet_id IS NULL OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.user_id = auth.uid())));
CREATE POLICY "Own reminders update" ON public.pet_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (pet_id IS NULL OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.user_id = auth.uid())));
CREATE POLICY "Own reminders delete" ON public.pet_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX pet_reminders_user_idx ON public.pet_reminders (user_id, due_date);
CREATE INDEX pet_reminders_pet_idx ON public.pet_reminders (pet_id);

CREATE POLICY "Own avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own avatar delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE public.course_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id text NOT NULL,
  course_title text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_notes TO authenticated;
GRANT ALL ON public.course_notes TO service_role;
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notes select" ON public.course_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own notes insert" ON public.course_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own notes update" ON public.course_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own notes delete" ON public.course_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX course_notes_user_idx ON public.course_notes (user_id, created_at DESC);
CREATE TRIGGER course_notes_touch BEFORE UPDATE ON public.course_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  time_zone text NOT NULL DEFAULT 'Africa/Kinshasa',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own push select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own push insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own push update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own push delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('quiz', 'chapter')),
  target integer NOT NULL CHECK (target BETWEEN 1 AND 50),
  period text NOT NULL CHECK (period IN ('day', 'week')),
  remind_hour integer NOT NULL DEFAULT 18 CHECK (remind_hour BETWEEN 0 AND 23),
  time_zone text NOT NULL DEFAULT 'Africa/Kinshasa',
  created_at timestamptz NOT NULL DEFAULT now(),
  achieved_at timestamptz,
  last_notified_on date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own goals select" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals update" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals delete" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX goals_active_idx ON public.goals (user_id) WHERE achieved_at IS NULL;

CREATE TABLE public.welcome_notices (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.welcome_notices TO authenticated;
GRANT ALL ON public.welcome_notices TO service_role;
ALTER TABLE public.welcome_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own welcome select" ON public.welcome_notices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own welcome insert" ON public.welcome_notices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own welcome delete" ON public.welcome_notices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.course_feedback (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  course_id text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  emailed_at timestamptz,
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT, INSERT, DELETE ON public.course_feedback TO authenticated;
GRANT UPDATE (user_id, course_id, answers, comment) ON public.course_feedback TO authenticated;
GRANT ALL ON public.course_feedback TO service_role;
ALTER TABLE public.course_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own feedback select" ON public.course_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own feedback insert" ON public.course_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own feedback update" ON public.course_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own feedback delete" ON public.course_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.donation_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_number text NOT NULL,
  message text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.donation_settings TO anon, authenticated;
GRANT ALL ON public.donation_settings TO service_role;
ALTER TABLE public.donation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads donation settings" ON public.donation_settings FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER donation_settings_touch BEFORE UPDATE ON public.donation_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.donation_settings (id, whatsapp_number, message) VALUES
  (1, '+243994531426', 'Bonjour VetoCare, je souhaite faire un don pour soutenir le projet. Comment puis-je procéder ?');