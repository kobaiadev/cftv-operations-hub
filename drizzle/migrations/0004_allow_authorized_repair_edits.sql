GRANT UPDATE ON public.repair_requests TO authenticated;
CREATE POLICY "Editors update repair requests" ON public.repair_requests FOR UPDATE TO authenticated USING (public.current_user_role() IN ('00','01')) WITH CHECK (public.current_user_role() IN ('00','01'));
