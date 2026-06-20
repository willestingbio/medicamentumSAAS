-- Fix CalendarEvent RLS: remove hospital_admin exception per TRD.md §4
-- CalendarEvent must be strict userId only (no org-level access)
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;

CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );
