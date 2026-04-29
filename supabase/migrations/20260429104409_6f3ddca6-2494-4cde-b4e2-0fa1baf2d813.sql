-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX idx_classes_join_code ON public.classes(join_code);

-- ============ CLASS MEMBERSHIPS ============
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_class_members_student ON public.class_members(student_id);

-- ============ LOCATIONS ============
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hint TEXT,
  qr_code TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_locations_class ON public.locations(class_id);
CREATE UNIQUE INDEX idx_locations_qr_class ON public.locations(class_id, qr_code);

-- Limit to 5 locations per class
CREATE OR REPLACE FUNCTION public.enforce_max_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.locations WHERE class_id = NEW.class_id) >= 5 THEN
    RAISE EXCEPTION 'A turma já tem 5 locais (máximo permitido).';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_max_locations
  BEFORE INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_locations();

-- ============ QUESTIONS (1 per location) ============
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_questions_location ON public.questions(location_id);
CREATE UNIQUE INDEX idx_questions_one_per_location ON public.questions(location_id);

-- ============ RUNS ============
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total_points INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER
);
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_runs_student ON public.runs(student_id);
CREATE INDEX idx_runs_class ON public.runs(class_id);
CREATE INDEX idx_runs_ranking ON public.runs(class_id, finished_at, duration_seconds);

-- ============ ANSWERS ============
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_answers_run ON public.answers(run_id);

-- ============ TRIGGER: auto-create profile + role ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Roles viewable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Classes viewable by authenticated"
  ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create classes"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own classes"
  ON public.classes FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classes"
  ON public.classes FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Members viewable by authenticated"
  ON public.class_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can join classes"
  ON public.class_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can leave classes"
  ON public.class_members FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Locations viewable by authenticated"
  ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage locations of own classes"
  ON public.locations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

CREATE POLICY "Questions viewable by authenticated"
  ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage questions of own classes"
  ON public.questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.locations l JOIN public.classes c ON c.id = l.class_id
    WHERE l.id = location_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.locations l JOIN public.classes c ON c.id = l.class_id
    WHERE l.id = location_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "Runs viewable by authenticated"
  ON public.runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can create own runs"
  ON public.runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own runs"
  ON public.runs FOR UPDATE TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Answers viewable by run owner or teacher"
  ON public.answers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.runs r WHERE r.id = run_id AND r.student_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.runs r
      JOIN public.classes c ON c.id = r.class_id
      WHERE r.id = run_id AND c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Students can insert own answers"
  ON public.answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.runs r WHERE r.id = run_id AND r.student_id = auth.uid()));