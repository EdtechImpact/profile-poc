// Weights for school structured similarity
const SCHOOL_WEIGHTS = {
  phase: 0.25,
  type: 0.15,
  size_band: 0.10,
  fsm_band: 0.15,
  ofsted_rating: 0.10,
  region: 0.10,
  trust_name: 0.10,
  urban_rural: 0.05,
};

// Weights for product structured similarity
const PRODUCT_WEIGHTS = {
  primary_category: 0.30,
  subjects: 0.25,
  age_range: 0.20,
  purchase_model: 0.10,
  send_suitability: 0.10,
  pedagogy_style: 0.05,
};

function exactMatch(a, b) {
  if (!a || !b) return 0;
  return String(a).toLowerCase() === String(b).toLowerCase() ? 1 : 0;
}

function arrayOverlap(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0)
    return 0;
  const setA = new Set(a.map((x) => String(x).toLowerCase()));
  const setB = new Set(b.map((x) => String(x).toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return intersection.length / union.size; // Jaccard
}

function ordinalProximity(a, b, orderedValues) {
  if (!a || !b) return 0;
  const idxA = orderedValues.indexOf(String(a).toLowerCase());
  const idxB = orderedValues.indexOf(String(b).toLowerCase());
  if (idxA === -1 || idxB === -1) return 0;
  const maxDist = orderedValues.length - 1;
  return 1 - Math.abs(idxA - idxB) / maxDist;
}

export function computeSchoolStructuredScore(fieldsA, fieldsB) {
  const scores = {};

  // Phase must match (hard filter — 0 if different)
  scores.phase = exactMatch(fieldsA.phase, fieldsB.phase);
  if (scores.phase === 0) return { total: 0, breakdown: scores };

  scores.type = exactMatch(fieldsA.type, fieldsB.type);
  scores.size_band = exactMatch(fieldsA.size_band, fieldsB.size_band);
  scores.fsm_band = exactMatch(fieldsA.fsm_band, fieldsB.fsm_band);
  scores.ofsted_rating = ordinalProximity(
    fieldsA.ofsted_rating,
    fieldsB.ofsted_rating,
    ["outstanding", "good", "requires improvement", "inadequate"]
  );
  scores.region = exactMatch(fieldsA.region, fieldsB.region);
  scores.trust_name =
    fieldsA.trust_name && fieldsB.trust_name
      ? exactMatch(fieldsA.trust_name, fieldsB.trust_name)
      : 0;
  scores.urban_rural = exactMatch(fieldsA.urban_rural, fieldsB.urban_rural);

  let total = 0;
  for (const [key, weight] of Object.entries(SCHOOL_WEIGHTS)) {
    total += (scores[key] || 0) * weight;
  }

  return { total, breakdown: scores };
}

export function computeProductStructuredScore(fieldsA, fieldsB) {
  const scores = {};

  scores.primary_category = exactMatch(fieldsA.primary_category, fieldsB.primary_category);
  scores.subjects = arrayOverlap(fieldsA.subjects, fieldsB.subjects);
  scores.age_range = arrayOverlap(fieldsA.age_range, fieldsB.age_range);
  scores.purchase_model = exactMatch(fieldsA.purchase_model, fieldsB.purchase_model);
  scores.send_suitability = exactMatch(fieldsA.send_suitability, fieldsB.send_suitability);
  scores.pedagogy_style = exactMatch(fieldsA.pedagogy_style, fieldsB.pedagogy_style);

  let total = 0;
  for (const [key, weight] of Object.entries(PRODUCT_WEIGHTS)) {
    total += (scores[key] || 0) * weight;
  }

  return { total, breakdown: scores };
}

export function computeStructuredScore(entityType, fieldsA, fieldsB) {
  return entityType === "school"
    ? computeSchoolStructuredScore(fieldsA, fieldsB)
    : computeProductStructuredScore(fieldsA, fieldsB);
}
