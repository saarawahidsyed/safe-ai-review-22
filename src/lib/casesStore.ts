import { useEffect, useState } from "react";
import { cases as seedCases, type ICSRCase } from "@/data/cases";

const KEY = "pvxai.cases.v1";
const EVENT = "pvxai-cases-changed";

function read(): ICSRCase[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedCases;
    const parsed = JSON.parse(raw) as ICSRCase[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedCases;
    return parsed;
  } catch {
    return seedCases;
  }
}

function write(cases: ICSRCase[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Shared store for ICSR cases across pages. Persists to localStorage so that
 * Patient IDs created on the Cases page are available in the Treatment
 * Advisor and Signal Detection pages.
 */
export function useCasesStore() {
  const [cases, setCases] = useState<ICSRCase[]>(() => read());

  useEffect(() => {
    const sync = () => setCases(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addCase = (c: ICSRCase) => {
    const next = [c, ...read().filter((x) => x.id !== c.id)];
    write(next);
    setCases(next);
  };

  const replaceAll = (next: ICSRCase[]) => {
    write(next);
    setCases(next);
  };

  return { cases, addCase, replaceAll };
}

export function getCasesSnapshot(): ICSRCase[] {
  return read();
}

/** Return unique patient IDs with a representative case for picker UIs. */
export function listPatients(cases: ICSRCase[]) {
  const map = new Map<string, ICSRCase>();
  for (const c of cases) {
    const pid = c.patient.patientId;
    if (!pid) continue;
    if (!map.has(pid)) map.set(pid, c);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.patient.patientId.localeCompare(b.patient.patientId),
  );
}

/** Aggregate all cases for a patient ID into a single profile. */
export function getPatientProfile(cases: ICSRCase[], patientId: string) {
  const matched = cases.filter((c) => c.patient.patientId === patientId);
  if (matched.length === 0) return null;
  const first = matched[0];
  const drugs = new Set<string>();
  const conditions = new Set<string>();
  const events = new Set<string>();
  for (const c of matched) {
    drugs.add(c.suspectDrug.name);
    for (const d of c.concomitantDrugs) drugs.add(d);
    for (const h of c.patient.medicalHistory) conditions.add(h);
    for (const e of c.events) events.add(e.pt);
  }
  return {
    patientId,
    age: first.patient.age,
    sex: first.patient.sex,
    weightKg: first.patient.weightKg,
    ethnicity: first.patient.ethnicity,
    medications: Array.from(drugs),
    conditions: Array.from(conditions),
    adverseEvents: Array.from(events),
    cases: matched,
  };
}