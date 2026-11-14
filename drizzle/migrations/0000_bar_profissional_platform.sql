CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', avatar_url text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL DEFAULT 'student', UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE POLICY roles_self ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE FUNCTION public.create_student_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.profiles(id,display_name) VALUES(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'student'); RETURN new; END $$;
CREATE TRIGGER on_bar_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_student_profile();
CREATE TABLE public.courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '', price numeric(10,2) NOT NULL DEFAULT 97 CHECK(price>=0), cover_url text, published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.courses TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.courses TO authenticated; GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_courses ON public.courses FOR SELECT TO anon,authenticated USING(published);
CREATE POLICY admin_courses ON public.courses FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.modules TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.modules TO authenticated; GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_modules ON public.modules FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.courses WHERE id=course_id AND published));
CREATE POLICY admin_modules ON public.modules FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,course_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.enrollments TO authenticated; GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_enrollments ON public.enrollments FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY admin_enrollments ON public.enrollments FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.can_access_course(_course_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.enrollments WHERE course_id=_course_id AND user_id=auth.uid()) $$;
CREATE TABLE public.lessons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', video_url text, video_path text, position integer NOT NULL DEFAULT 0, published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lessons TO authenticated; GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrolled_lessons ON public.lessons FOR SELECT TO authenticated USING(published AND EXISTS(SELECT 1 FROM public.modules WHERE id=module_id AND public.can_access_course(course_id)));
CREATE POLICY admin_lessons ON public.lessons FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, category text NOT NULL DEFAULT 'Materiais educacionais', course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL, module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL, lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL, path text NOT NULL UNIQUE, mime_type text NOT NULL, size bigint NOT NULL DEFAULT 0, is_public boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.resources TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.resources TO authenticated; GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_resources ON public.resources FOR SELECT TO anon,authenticated USING(is_public);
CREATE POLICY enrolled_resources ON public.resources FOR SELECT TO authenticated USING(public.can_access_course(course_id) OR EXISTS(SELECT 1 FROM public.modules WHERE id=module_id AND public.can_access_course(course_id)) OR EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE l.id=lesson_id AND public.can_access_course(m.course_id)));
CREATE POLICY admin_resources ON public.resources FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.lesson_progress (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE, completed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,lesson_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lesson_progress TO authenticated; GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_progress ON public.lesson_progress FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.lessons WHERE id=lesson_id));
CREATE TABLE public.testimonials (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, content text NOT NULL, published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.testimonials TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.testimonials TO authenticated; GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_testimonials ON public.testimonials FOR SELECT TO anon,authenticated USING(published);
CREATE POLICY admin_testimonials ON public.testimonials FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.site_settings (key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}');
GRANT SELECT ON public.site_settings TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.site_settings TO authenticated; GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_settings ON public.site_settings FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY admin_settings ON public.site_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_media ON storage.objects FOR ALL TO authenticated USING(bucket_id='course-media' AND public.has_role(auth.uid(),'admin')) WITH CHECK(bucket_id='course-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY allowed_media ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='course-media' AND EXISTS(SELECT 1 FROM public.resources WHERE path=name));
INSERT INTO public.courses(id,title,description,price,published) VALUES('00000000-0000-4000-8000-000000000001','BAR PROFISSIONAL — DO BALCÃO À GESTÃO.','Aprenda os processos, ferramentas e estratégias que transformam conhecimento de balcão em gestão profissional.',97,true);
INSERT INTO public.modules(course_id,title,description,position) VALUES
('00000000-0000-4000-8000-000000000001','Organização e operação de bar','Mise en place, organização e padronização operacional.',1),
('00000000-0000-4000-8000-000000000001','Fichas técnicas e padronização','Processos consistentes e controle de qualidade.',2),
('00000000-0000-4000-8000-000000000001','CMV e precificação','Custos, margens e precificação profissional.',3),
('00000000-0000-4000-8000-000000000001','Estoque e controle de perdas','Inventário, compras e redução de desperdícios.',4),
('00000000-0000-4000-8000-000000000001','Gestão de equipe','Rotinas, responsabilidades e operação integrada.',5),
('00000000-0000-4000-8000-000000000001','Rentabilidade e gestão','Indicadores e decisões para o negócio.',6);
INSERT INTO public.site_settings(key,value) VALUES('home','{"headline":"Domine a operação.\nControle seus números.\nProfissionalize seu bar.","description":"Aprenda os processos, ferramentas e estratégias que transformam conhecimento de balcão em gestão profissional.","checkout_url":"","bio":"","hero_resource_id":"","portrait_resource_id":"","cta":"Quero profissionalizar meu bar","faq":[{"question":"Para quem é o treinamento?","answer":"Para bartenders, profissionais de hospitalidade, gerentes e proprietários que desejam profissionalizar a operação do bar."},{"question":"Como recebo meu acesso?","answer":"Após a compra, seu acesso será autorizado pela equipe. Entre com seu e-mail e senha para acompanhar seus cursos."},{"question":"Posso assistir pelo celular?","answer":"Sim. A área do aluno pode ser acessada pelo celular, tablet ou computador."}]}');
CREATE INDEX modules_course_idx ON public.modules(course_id); CREATE INDEX lessons_module_idx ON public.lessons(module_id); CREATE INDEX enrollments_user_idx ON public.enrollments(user_id); CREATE INDEX resources_course_idx ON public.resources(course_id);