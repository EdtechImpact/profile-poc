// Cross-type scoring: how well does a product fit a school?
// Maps school attributes to product attributes across compatible dimensions.

const CROSS_TYPE_WEIGHTS = {
  phase_age_alignment: 0.30,
  subject_overlap: 0.25,
  budget_fit: 0.15,
  pedagogy_fit: 0.15,
  send_alignment: 0.10,
  sixth_form_alignment: 0.05,
};

const PHASE_AGE_MAP = {
  primary: ["3-5", "5-7", "7-11", "3-7", "5-11"],
  secondary: ["11-14", "11-16", "14-16", "11-18"],
  "all-through": ["3-5", "5-7", "7-11", "3-7", "5-11", "11-14", "11-16", "14-16", "11-18"],
  "16 plus": ["16-18", "16-19", "16+"],
  nursery: ["0-3", "2-5", "3-5"],
  special: ["3-5", "5-7", "7-11", "11-14", "11-16", "14-16"],
};

function normalizeAgeRange(ageRange) {
  if (!ageRange) return [];
  if (Array.isArray(ageRange)) return ageRange.map((a) => String(a).toLowerCase().trim());
  return String(ageRange).split(",").map((a) => a.toLowerCase().trim());
}

function arrayOverlap(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((x) => String(x).toLowerCase().trim()));
  const setB = new Set(b.map((x) => String(x).toLowerCase().trim()));
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return intersection.length / union.size;
}

function exactMatch(a, b) {
  if (!a || !b) return 0;
  return String(a).toLowerCase().trim() === String(b).toLowerCase().trim() ? 1 : 0;
}

function computePhaseAgeScore(schoolFields, productFields) {
  const phase = String(schoolFields.phase || "").toLowerCase();
  const productAges = normalizeAgeRange(productFields.age_range);
  if (!phase || productAges.length === 0) return 0;

  const expectedAges = PHASE_AGE_MAP[phase] || [];
  if (expectedAges.length === 0) return 0;

  return arrayOverlap(expectedAges, productAges);
}

function computeSubjectScore(schoolFields, productFields) {
  // Schools may not have subjects directly, but products do
  // If school has likely_tech_needs or subjects, compare
  const productSubjects = productFields.subjects || [];
  if (productSubjects.length === 0) return 0.5; // Neutral if no subjects listed

  // Use school's likely_tech_needs as a proxy for subject interest
  const schoolNeeds = schoolFields.likely_tech_needs || "";
  if (!schoolNeeds) return 0.5;

  // Simple keyword matching: check if product subjects appear in school needs
  const needsLower = schoolNeeds.toLowerCase();
  let matches = 0;
  for (const subject of productSubjects) {
    if (needsLower.includes(subject.toLowerCase())) matches++;
  }
  return productSubjects.length > 0 ? matches / productSubjects.length : 0.5;
}

function computeBudgetScore(schoolFields, productFields) {
  const fsmBand = String(schoolFields.fsm_band || "").toLowerCase();
  const deprivation = String(schoolFields.deprivation_level || "").toLowerCase();
  const purchaseModel = String(productFields.purchase_model || "").toLowerCase();

  if (!purchaseModel) return 0.5;

  const isHighDeprivation =
    fsmBand.includes("high") || deprivation.includes("high") || deprivation.includes("severe");
  const isLowDeprivation =
    fsmBand.includes("low") || deprivation.includes("low") || deprivation.includes("affluent");

  const isFreeOrFreemium =
    purchaseModel.includes("free") || purchaseModel.includes("freemium");
  const isSubscription = purchaseModel.includes("subscription");
  const isPerPupil = purchaseModel.includes("per") && purchaseModel.includes("pupil");

  if (isHighDeprivation) {
    if (isFreeOrFreemium) return 1.0;
    if (isPerPupil) return 0.6;
    if (isSubscription) return 0.4;
    return 0.3;
  }
  if (isLowDeprivation) {
    return 0.8; // Can afford most models
  }
  // Medium deprivation
  if (isFreeOrFreemium) return 0.9;
  return 0.6;
}

function computePedagogyScore(schoolFields, productFields) {
  const schoolCharacter = String(schoolFields.school_character || "").toLowerCase();
  const pedagogy = String(productFields.pedagogy_style || "").toLowerCase();
  const targetType = String(productFields.target_school_type || "").toLowerCase();

  let score = 0.5; // Neutral default

  // If product explicitly targets a school type and it matches
  if (targetType) {
    const schoolType = String(schoolFields.type || "").toLowerCase();
    if (schoolType && targetType.includes(schoolType)) score += 0.3;
    else if (targetType.includes("all") || targetType.includes("any")) score += 0.1;
  }

  // Pedagogy keywords alignment with school character
  if (schoolCharacter && pedagogy) {
    if (schoolCharacter.includes("faith") && pedagogy.includes("values")) score += 0.2;
    if (schoolCharacter.includes("academic") && pedagogy.includes("mastery")) score += 0.2;
    if (schoolCharacter.includes("creative") && pedagogy.includes("project")) score += 0.2;
  }

  return Math.min(score, 1.0);
}

function computeSendScore(schoolFields, productFields) {
  const sendSuitability = String(productFields.send_suitability || "").toLowerCase();
  if (!sendSuitability) return 0.5;
  if (sendSuitability.includes("high") || sendSuitability.includes("specialist")) return 0.9;
  if (sendSuitability.includes("good") || sendSuitability.includes("moderate")) return 0.7;
  return 0.5;
}

function computeSixthFormScore(schoolFields, productFields) {
  const hasSixthForm = schoolFields.has_sixth_form;
  const productAges = normalizeAgeRange(productFields.age_range);

  if (!hasSixthForm) return 0.5; // Neutral

  const covers16Plus = productAges.some(
    (a) => a.includes("16") || a.includes("17") || a.includes("18") || a.includes("a-level")
  );
  return covers16Plus ? 1.0 : 0.3;
}

export function computeCrossTypeScore(schoolFields, productFields) {
  const breakdown = {
    phase_age_alignment: computePhaseAgeScore(schoolFields, productFields),
    subject_overlap: computeSubjectScore(schoolFields, productFields),
    budget_fit: computeBudgetScore(schoolFields, productFields),
    pedagogy_fit: computePedagogyScore(schoolFields, productFields),
    send_alignment: computeSendScore(schoolFields, productFields),
    sixth_form_alignment: computeSixthFormScore(schoolFields, productFields),
  };

  let total = 0;
  for (const [key, weight] of Object.entries(CROSS_TYPE_WEIGHTS)) {
    total += (breakdown[key] || 0) * weight;
  }

  return { total, breakdown };
}
