CREATE TABLE public.app_state (
 namespace text PRIMARY KEY CHECK (namespace IN ('os','cadastro','supervisoes')),
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_by uuid NOT NULL DEFAULT auth.uid(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read operational state" ON public.app_state FOR SELECT TO authenticated USING (public.current_user_role() IN ('00','01','02','03'));
CREATE POLICY "Editors insert operational state" ON public.app_state FOR INSERT TO authenticated WITH CHECK (public.current_user_role() IN ('00','01') AND updated_by = (SELECT auth.uid()));
CREATE POLICY "Editors update operational state" ON public.app_state FOR UPDATE TO authenticated USING (public.current_user_role() IN ('00','01')) WITH CHECK (public.current_user_role() IN ('00','01') AND updated_by = (SELECT auth.uid()));
CREATE TABLE public.app_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entity_type text NOT NULL CHECK (entity_type IN ('os','supervisao')),
 entity_id text NOT NULL,
 label text NOT NULL DEFAULT '',
 file_name text NOT NULL,
 content_type text NOT NULL DEFAULT 'application/octet-stream',
 storage_path text NOT NULL UNIQUE,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.app_attachments TO authenticated;
GRANT ALL ON public.app_attachments TO service_role;
ALTER TABLE public.app_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX app_attachments_entity_idx ON public.app_attachments(entity_type,entity_id);
CREATE POLICY "Read attachment metadata" ON public.app_attachments FOR SELECT TO authenticated USING (public.current_user_role() IN ('00','01','02','03'));
CREATE POLICY "Editors insert attachments" ON public.app_attachments FOR INSERT TO authenticated WITH CHECK (public.current_user_role() IN ('00','01') AND created_by = (SELECT auth.uid()));
CREATE POLICY "Editors delete attachments" ON public.app_attachments FOR DELETE TO authenticated USING (public.current_user_role() IN ('00','01'));
CREATE TABLE public.work_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_name text NOT NULL,
 event_date date NOT NULL,
 occurrence_type text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read work orders" ON public.work_orders FOR SELECT TO authenticated USING (public.current_user_role() IN ('00','01','02','03'));
CREATE POLICY "Editors insert work orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (public.current_user_role() IN ('00','01') AND created_by = (SELECT auth.uid()));
CREATE POLICY "Read private attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'private-attachments' AND public.current_user_role() IN ('00','01','02','03'));
CREATE POLICY "Editors upload private attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'private-attachments' AND public.current_user_role() IN ('00','01'));
CREATE POLICY "Editors delete private attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'private-attachments' AND public.current_user_role() IN ('00','01'));
CREATE POLICY "Editors delete repair images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'repair-images' AND public.current_user_role() IN ('00','01'));
NOTIFY pgrst, 'reload schema';