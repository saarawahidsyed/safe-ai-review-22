export type Severity = "Mild" | "Moderate" | "Severe" | "Life-threatening";
export type Outcome = "Recovered" | "Recovering" | "Not recovered" | "Fatal" | "Unknown";
export type Causality = "Certain" | "Probable" | "Possible" | "Unlikely";

export interface NarrativeToken {
  text: string;
  weight?: number; // -1..1, positive = drove prediction toward AE, negative = protective
  tag?: "drug" | "event" | "temporal" | "dose" | "lab";
}

export interface MeddraEvent {
  pt: string; // Preferred Term
  soc: string; // System Organ Class
  llt?: string; // Lowest Level Term
  severity: Severity;
  outcome: Outcome;
  causality: Causality;
  onsetDays: number;
}

export interface ICSRCase {
  id: string;
  patient: {
    age: number;
    sex: "M" | "F";
    weightKg: number;
    ethnicity: string;
    medicalHistory: string[];
  };
  reporter: {
    type: "Physician" | "Pharmacist" | "Consumer" | "Nurse";
    country: string;
    date: string;
  };
  suspectDrug: {
    name: string;
    dose: string;
    route: string;
    indication: string;
    startDate: string;
  };
  concomitantDrugs: string[];
  events: MeddraEvent[];
  narrative: NarrativeToken[];
  aiPrediction: {
    label: string;
    confidence: number;
    topDrivers: string[];
  };
  seriousness: ("Hospitalization" | "Life-threatening" | "Disability" | "Death" | "Congenital anomaly")[];
}

const tokenize = (text: string, highlights: { phrase: string; weight: number; tag?: NarrativeToken["tag"] }[]): NarrativeToken[] => {
  // Split text by highlight phrases, preserving order. Case-insensitive match.
  const tokens: NarrativeToken[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let matchIdx = -1;
    let matchLen = 0;
    let matched: typeof highlights[number] | null = null;
    for (const h of highlights) {
      const idx = remaining.toLowerCase().indexOf(h.phrase.toLowerCase());
      if (idx >= 0 && (matchIdx === -1 || idx < matchIdx)) {
        matchIdx = idx;
        matchLen = h.phrase.length;
        matched = h;
      }
    }
    if (matchIdx === -1) {
      tokens.push({ text: remaining });
      break;
    }
    if (matchIdx > 0) tokens.push({ text: remaining.slice(0, matchIdx) });
    tokens.push({ text: remaining.slice(matchIdx, matchIdx + matchLen), weight: matched!.weight, tag: matched!.tag });
    remaining = remaining.slice(matchIdx + matchLen);
  }
  return tokens;
};

export const cases: ICSRCase[] = [
  {
    id: "ICSR-2024-08412",
    patient: {
      age: 78,
      sex: "F",
      weightKg: 62,
      ethnicity: "Caucasian",
      medicalHistory: ["Atrial fibrillation", "Hypertension", "Stage 3 CKD (eGFR 38)", "Prior TIA (2021)"],
    },
    reporter: { type: "Physician", country: "Germany", date: "2024-08-14" },
    suspectDrug: {
      name: "Apixaban",
      dose: "5 mg twice daily",
      route: "Oral",
      indication: "Stroke prevention in atrial fibrillation",
      startDate: "2024-02-03",
    },
    concomitantDrugs: ["Aspirin 81 mg daily", "Lisinopril 20 mg", "Atorvastatin 40 mg"],
    events: [
      { pt: "Intracranial haemorrhage", soc: "Nervous system disorders", llt: "Subdural haematoma", severity: "Life-threatening", outcome: "Recovering", causality: "Probable", onsetDays: 192 },
      { pt: "Headache", soc: "Nervous system disorders", severity: "Moderate", outcome: "Recovered", causality: "Possible", onsetDays: 190 },
      { pt: "Confusional state", soc: "Psychiatric disorders", severity: "Moderate", outcome: "Recovering", causality: "Possible", onsetDays: 191 },
    ],
    narrative: tokenize(
      "78-year-old female with non-valvular atrial fibrillation initiated on apixaban 5 mg twice daily in February 2024. Patient has stage 3 CKD with eGFR 38 mL/min and was concurrently taking aspirin 81 mg daily for secondary prevention. After approximately 6 months of treatment, patient developed sudden-onset severe headache and progressive confusion. Brought to emergency department where CT imaging revealed subdural haematoma. Anticoagulation was reversed and patient was admitted to neurosurgical ICU. No recent trauma reported. INR monitoring had been performed regularly per protocol.",
      [
        { phrase: "78-year-old", weight: 0.7, tag: "lab" },
        { phrase: "stage 3 CKD with eGFR 38 mL/min", weight: 0.85, tag: "lab" },
        { phrase: "apixaban 5 mg twice daily", weight: 0.4, tag: "drug" },
        { phrase: "aspirin 81 mg daily", weight: 0.9, tag: "drug" },
        { phrase: "6 months", weight: 0.3, tag: "temporal" },
        { phrase: "subdural haematoma", weight: 0.6, tag: "event" },
        { phrase: "sudden-onset severe headache", weight: 0.5, tag: "event" },
        { phrase: "INR monitoring had been performed regularly", weight: -0.4, tag: "lab" },
        { phrase: "No recent trauma", weight: -0.2 },
      ],
    ),
    aiPrediction: {
      label: "Intracranial hemorrhage — Probable causal association",
      confidence: 92,
      topDrivers: ["Concomitant aspirin", "Renal impairment", "Advanced age", "Treatment duration"],
    },
    seriousness: ["Hospitalization", "Life-threatening"],
  },
  {
    id: "ICSR-2024-08510",
    patient: {
      age: 54,
      sex: "M",
      weightKg: 98,
      ethnicity: "Hispanic",
      medicalHistory: ["Type 2 diabetes", "Obesity (BMI 34)", "Cholelithiasis (2019)", "Hypertriglyceridemia"],
    },
    reporter: { type: "Physician", country: "United States", date: "2024-08-22" },
    suspectDrug: {
      name: "Semaglutide",
      dose: "1 mg weekly",
      route: "Subcutaneous",
      indication: "Type 2 diabetes mellitus",
      startDate: "2024-06-10",
    },
    concomitantDrugs: ["Metformin 1000 mg BID", "Atorvastatin 20 mg", "Lisinopril 10 mg"],
    events: [
      { pt: "Pancreatitis acute", soc: "Gastrointestinal disorders", severity: "Severe", outcome: "Recovering", causality: "Probable", onsetDays: 62 },
      { pt: "Abdominal pain upper", soc: "Gastrointestinal disorders", severity: "Severe", outcome: "Recovering", causality: "Probable", onsetDays: 60 },
      { pt: "Vomiting", soc: "Gastrointestinal disorders", severity: "Moderate", outcome: "Recovered", causality: "Probable", onsetDays: 61 },
    ],
    narrative: tokenize(
      "54-year-old male with type 2 diabetes initiated on semaglutide 1 mg weekly in June 2024. Patient has prior history of cholelithiasis (2019) and baseline triglycerides of 580 mg/dL. Approximately 60 days after initiation, patient presented to ED with severe epigastric pain radiating to back, accompanied by nausea and vomiting. Lipase was elevated to 8x upper limit of normal. CT confirmed acute pancreatitis without necrosis. Semaglutide was discontinued and patient managed with supportive care. Symptoms improved over 5 days.",
      [
        { phrase: "type 2 diabetes", weight: 0.1 },
        { phrase: "semaglutide 1 mg weekly", weight: 0.3, tag: "drug" },
        { phrase: "history of cholelithiasis", weight: 0.85, tag: "lab" },
        { phrase: "triglycerides of 580 mg/dL", weight: 0.8, tag: "lab" },
        { phrase: "60 days after initiation", weight: 0.75, tag: "temporal" },
        { phrase: "severe epigastric pain radiating to back", weight: 0.7, tag: "event" },
        { phrase: "Lipase was elevated to 8x upper limit of normal", weight: 0.65, tag: "lab" },
        { phrase: "acute pancreatitis", weight: 0.6, tag: "event" },
        { phrase: "Symptoms improved over 5 days", weight: -0.3 },
      ],
    ),
    aiPrediction: {
      label: "Acute pancreatitis — Probable causal association",
      confidence: 86,
      topDrivers: ["Prior cholelithiasis", "Hypertriglyceridemia", "Onset within 90 days"],
    },
    seriousness: ["Hospitalization"],
  },
  {
    id: "ICSR-2024-08623",
    patient: {
      age: 67,
      sex: "M",
      weightKg: 88,
      ethnicity: "Asian",
      medicalHistory: ["Hyperlipidemia", "Hypothyroidism (untreated)", "Recent URI"],
    },
    reporter: { type: "Pharmacist", country: "Japan", date: "2024-09-02" },
    suspectDrug: {
      name: "Atorvastatin",
      dose: "80 mg daily",
      route: "Oral",
      indication: "Secondary prevention of cardiovascular disease",
      startDate: "2024-04-15",
    },
    concomitantDrugs: ["Clarithromycin 500 mg BID (started 2024-08-20)", "Aspirin 81 mg"],
    events: [
      { pt: "Rhabdomyolysis", soc: "Musculoskeletal and connective tissue disorders", severity: "Severe", outcome: "Recovering", causality: "Probable", onsetDays: 145 },
      { pt: "Blood creatine phosphokinase increased", soc: "Investigations", severity: "Severe", outcome: "Recovering", causality: "Probable", onsetDays: 145 },
      { pt: "Myalgia", soc: "Musculoskeletal and connective tissue disorders", severity: "Severe", outcome: "Recovering", causality: "Probable", onsetDays: 142 },
    ],
    narrative: tokenize(
      "67-year-old male on atorvastatin 80 mg daily for secondary CV prevention since April 2024. Recently prescribed clarithromycin 500 mg BID for community-acquired pneumonia approximately 10 days prior to presentation. Patient developed progressive bilateral thigh and calf myalgia, dark urine, and weakness over 4 days. Laboratory evaluation showed CK 18,400 U/L (>50x ULN) and serum creatinine 1.9 mg/dL. Diagnosed with rhabdomyolysis attributed to drug-drug interaction. Both atorvastatin and clarithromycin discontinued; aggressive IV hydration initiated. Hypothyroidism noted but untreated.",
      [
        { phrase: "atorvastatin 80 mg daily", weight: 0.7, tag: "drug" },
        { phrase: "clarithromycin 500 mg BID", weight: 0.95, tag: "drug" },
        { phrase: "10 days prior", weight: 0.6, tag: "temporal" },
        { phrase: "bilateral thigh and calf myalgia", weight: 0.55, tag: "event" },
        { phrase: "dark urine", weight: 0.5, tag: "event" },
        { phrase: "CK 18,400 U/L", weight: 0.85, tag: "lab" },
        { phrase: "serum creatinine 1.9 mg/dL", weight: 0.5, tag: "lab" },
        { phrase: "rhabdomyolysis", weight: 0.6, tag: "event" },
        { phrase: "Hypothyroidism noted but untreated", weight: 0.4, tag: "lab" },
      ],
    ),
    aiPrediction: {
      label: "Rhabdomyolysis — Probable drug-drug interaction (CYP3A4)",
      confidence: 78,
      topDrivers: ["High-dose statin", "CYP3A4 inhibitor co-administration", "Untreated hypothyroidism"],
    },
    seriousness: ["Hospitalization"],
  },
];
