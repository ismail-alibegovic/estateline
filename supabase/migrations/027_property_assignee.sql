-- Bulk property assignment: track which team member owns a listing.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_properties_assigned
  ON public.properties(assigned_to);
