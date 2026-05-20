-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'supervisor', 'employee');
CREATE TYPE public.check_in_method AS ENUM ('qr', 'biometric', 'whatsapp', 'manual');
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent', 'on_leave');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  department TEXT,
  site TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius_m INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Shifts table
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Attendance records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  method public.check_in_method NOT NULL DEFAULT 'manual',
  status public.attendance_status NOT NULL DEFAULT 'present',
  site_id UUID REFERENCES public.sites(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  hours_worked NUMERIC(5,2),
  overtime NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Helper: get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.profiles
  WHERE id = _user_id
$$;

-- Helper: get user's site
CREATE OR REPLACE FUNCTION public.get_user_site(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site FROM public.profiles
  WHERE id = _user_id
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- PROFILES
CREATE POLICY "Admins full access to profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers read department profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager')
    AND department = public.get_user_department(auth.uid())
  );

CREATE POLICY "Supervisors read site profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'supervisor')
    AND site = public.get_user_site(auth.uid())
  );

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- USER ROLES
CREATE POLICY "Admins full access to user_roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers read roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors read roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

-- SITES
CREATE POLICY "Admins full access to sites"
  ON public.sites FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read sites"
  ON public.sites FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- DEPARTMENTS
CREATE POLICY "Admins full access to departments"
  ON public.departments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read departments"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- SHIFTS
CREATE POLICY "Admins full access to shifts"
  ON public.shifts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read shifts"
  ON public.shifts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ATTENDANCE RECORDS
CREATE POLICY "Admins full access to attendance"
  ON public.attendance_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers read all attendance"
  ON public.attendance_records FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers verify attendance"
  ON public.attendance_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors read team attendance"
  ON public.attendance_records FOR SELECT
  USING (
    public.has_role(auth.uid(), 'supervisor')
    AND employee_id IN (
      SELECT id FROM public.profiles
      WHERE site = public.get_user_site(auth.uid())
    )
  );

CREATE POLICY "Employees read own attendance"
  ON public.attendance_records FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees insert own attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees update own attendance"
  ON public.attendance_records FOR UPDATE
  USING (auth.uid() = employee_id);

-- AUDIT LOG
CREATE POLICY "Admins read all audit logs"
  ON public.audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own audit logs"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);