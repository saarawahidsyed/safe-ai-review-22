import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolved-after threshold (days) — signals not seen for this long become "resolved"
const RESOLVED_AFTER_DAYS = 30;
// Min case count to be considered a candidate signal
const MIN_CASES = 2;
// Min PRR to flag
const MIN_PRR = 2;

interface CaseRow {
  case_ref: string;
  suspect_drug: any;
  events: any;
}

function extractPairs(rows: CaseRow[]) {
  // Map<drug, Map<event, {count, soc}>>
  const pairs = new Map<string, Map<string, { count: number; soc: string | null }>>();
  const drugTotals = new Map<string, number>();
  const eventTotals = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const drug: string | undefined =
      row.suspect_drug?.name || row.suspect_drug?.drug || row.suspect_drug?.product;
    if (!drug) continue;
    const events: any[] = Array.isArray(row.events) ? row.events : [];
    if (events.length === 0) continue;

    const seenEvents = new Set<string>();
    for (const ev of events) {
      const term: string | undefined = ev?.term || ev?.pt || ev?.event || ev?.name;
      if (!term || seenEvents.has(term)) continue;
      seenEvents.add(term);
      const soc: string | null = ev?.soc ?? null;

      if (!pairs.has(drug)) pairs.set(drug, new Map());
      const inner = pairs.get(drug)!;
      const prev = inner.get(term);
      inner.set(term, { count: (prev?.count ?? 0) + 1, soc: prev?.soc ?? soc });

      eventTotals.set(term, (eventTotals.get(term) ?? 0) + 1);
      drugTotals.set(drug, (drugTotals.get(drug) ?? 0) + 1);
      total += 1;
    }
  }

  return { pairs, drugTotals, eventTotals, total };
}

function computeSignals(rows: CaseRow[]) {
  const { pairs, drugTotals, eventTotals, total } = extractPairs(rows);
  const out: Array<{
    drug: string;
    event_term: string;
    soc: string | null;
    case_count: number;
    prr: number;
    ror: number;
    ic: number;
    ic_lower: number;
    chi_squared: number;
    confidence: number;
  }> = [];

  for (const [drug, inner] of pairs) {
    const drugTotal = drugTotals.get(drug) ?? 0;
    for (const [term, { count: a, soc }] of inner) {
      if (a < MIN_CASES) continue;
      const eventTotal = eventTotals.get(term) ?? 0;
      const b = drugTotal - a;
      const c = eventTotal - a;
      const d = total - drugTotal - eventTotal + a;
      if (b <= 0 || c <= 0 || d <= 0) continue;

      const prr = (a / (a + b)) / (c / (c + d));
      const n = a + b + c + d;
      const expected = ((a + b) * (a + c)) / n;
      const chi = expected > 0 ? Math.pow(a - expected, 2) / expected : 0;
      // Reporting Odds Ratio
      const ror = (a * d) / (b * c);
      // Bayesian Information Component (BCPNN, Bate et al.)
      // IC = log2( a*N / ((a+b)*(a+c)) ) with +0.5 smoothing
      const ic = Math.log2(((a + 0.5) * (n + 2)) / (((a + b) + 1) * ((a + c) + 1)));
      // Approximate IC 95% lower bound (Norén-style variance)
      const icVar = 1 / Math.LN2 ** 2 * (1 / (a + 0.5) - 1 / (n + 2) + 1 / ((a + b) + 1) + 1 / ((a + c) + 1));
      const icLower = ic - 1.96 * Math.sqrt(Math.max(icVar, 0));
      // Simple confidence heuristic 0-100, saturates with PRR & case count
      const confidence = Math.min(99, Math.round(50 + 10 * Math.log2(prr) + 5 * Math.log2(a)));

      if (prr >= MIN_PRR) {
        out.push({
          drug,
          event_term: term,
          soc,
          case_count: a,
          prr: Number(prr.toFixed(2)),
          ror: Number(ror.toFixed(2)),
          ic: Number(ic.toFixed(2)),
          ic_lower: Number(icLower.toFixed(2)),
          chi_squared: Number(chi.toFixed(2)),
          confidence: Math.max(0, confidence),
        });
      }
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: cases, error: casesErr } = await supabase
      .from("cases")
      .select("case_ref, suspect_drug, events");
    if (casesErr) throw casesErr;

    const detected = computeSignals((cases ?? []) as CaseRow[]);
    const now = new Date().toISOString();

    const { data: existing, error: exErr } = await supabase
      .from("signals")
      .select("id, drug, event_term, case_count, status, last_detected_at");
    if (exErr) throw exErr;

    const existingMap = new Map<string, any>();
    for (const s of existing ?? []) existingMap.set(`${s.drug}|${s.event_term}`, s);
    const detectedKeys = new Set(detected.map((d) => `${d.drug}|${d.event_term}`));

    let inserted = 0, updated = 0, resolved = 0;

    for (const d of detected) {
      const key = `${d.drug}|${d.event_term}`;
      const prev = existingMap.get(key);
      if (!prev) {
        const { error } = await supabase.from("signals").insert({
          drug: d.drug,
          event_term: d.event_term,
          soc: d.soc,
          case_count: d.case_count,
          previous_case_count: 0,
          prr: d.prr,
          ror: d.ror,
          ic: d.ic,
          ic_lower: d.ic_lower,
          chi_squared: d.chi_squared,
          confidence: d.confidence,
          status: "new",
          first_detected_at: now,
          last_detected_at: now,
        });
        if (error) console.error("insert error", error);
        else inserted++;
      } else {
        const status =
          prev.status === "resolved" ? "updated"
            : d.case_count > prev.case_count ? "updated"
            : prev.status === "new" ? "new" : prev.status;
        const { error } = await supabase
          .from("signals")
          .update({
            soc: d.soc,
            previous_case_count: prev.case_count,
            case_count: d.case_count,
            prr: d.prr,
            ror: d.ror,
            ic: d.ic,
            ic_lower: d.ic_lower,
            chi_squared: d.chi_squared,
            confidence: d.confidence,
            status,
            last_detected_at: now,
          })
          .eq("id", prev.id);
        if (error) console.error("update error", error);
        else updated++;
      }
    }

    // Mark resolved: previously detected but no longer in detected set, and stale
    const cutoff = Date.now() - RESOLVED_AFTER_DAYS * 24 * 3600 * 1000;
    for (const s of existing ?? []) {
      const key = `${s.drug}|${s.event_term}`;
      if (detectedKeys.has(key)) continue;
      if (s.status === "resolved") continue;
      const last = new Date(s.last_detected_at).getTime();
      if (last < cutoff) {
        const { error } = await supabase
          .from("signals")
          .update({ status: "resolved" })
          .eq("id", s.id);
        if (!error) resolved++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, detected: detected.length, inserted, updated, resolved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("detect-signals error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});