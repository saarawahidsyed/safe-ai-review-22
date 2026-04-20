
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug TEXT NOT NULL,
  event_term TEXT NOT NULL,
  soc TEXT,
  case_count INTEGER NOT NULL DEFAULT 0,
  previous_case_count INTEGER NOT NULL DEFAULT 0,
  prr NUMERIC NOT NULL DEFAULT 0,
  chi_squared NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drug, event_term)
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY signals_select_auth ON public.signals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY signals_admin_insert ON public.signals
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY signals_admin_update ON public.signals
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY signals_admin_delete ON public.signals
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_signals_status ON public.signals(status);
CREATE INDEX idx_signals_last_detected ON public.signals(last_detected_at DESC);

CREATE TRIGGER trg_signals_updated_at
  BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
