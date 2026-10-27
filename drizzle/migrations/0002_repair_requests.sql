CREATE TABLE public.repair_requests (
  id text PRIMARY KEY,
  loja text NOT NULL,
  empresa_responsavel text NOT NULL DEFAULT '',
  gerente text NOT NULL DEFAULT '',
  solicitante text NOT NULL DEFAULT '',
  glpi_numero text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  imagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.repair_requests TO authenticated;
GRANT ALL ON public.repair_requests TO service_role;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read repair requests" ON public.repair_requests FOR SELECT TO authenticated USING (public.current_user_role() IS NOT NULL);
CREATE POLICY "Editors create repair requests" ON public.repair_requests FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()) AND public.current_user_role() IN ('00','01'));
CREATE POLICY "Editors delete repair requests" ON public.repair_requests FOR DELETE TO authenticated USING (public.current_user_role() IN ('00','01'));
CREATE POLICY "Read repair images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'repair-images' AND public.current_user_role() IS NOT NULL);
CREATE POLICY "Upload repair images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'repair-images' AND public.current_user_role() IN ('00','01'));