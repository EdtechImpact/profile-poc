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
  primary_category: 0.22,
  subjects: 0.18,
  age_range: 0.15,
  purchase_model: 0.08,
  send_suitability: 0.07,
  pedagogy_style: 0.05,
  alternatives_overlap: 0.13,
  impact_profile_similarity: 0.12,
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

function cosineOfVectors(a, b) {
  if (!a || !b) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function impactProfileSimilarity(fieldsA, fieldsB) {
  const impA = fieldsA.educational_impact;
  const impB = fieldsB.educational_impact;
  if (!impA || !impB) return 0;

  const vecA = [
    impA.build_student_knowledge || 0,
    impA.improve_attainment || 0,
    impA.improve_teaching_efficiency || 0,
    impA.reduce_teacher_workload || 0,
    impA.improve_teacher_knowledge || 0,
  ];
  const vecB = [
    impB.build_student_knowledge || 0,
    impB.improve_attainment || 0,
    impB.improve_teaching_efficiency || 0,
    impB.reduce_teacher_workload || 0,
    impB.improve_teacher_knowledge || 0,
  ];

  // Skip if both vectors are all zeros
  if (vecA.every(v => v === 0) && vecB.every(v => v === 0)) return 0;

  return cosineOfVectors(vecA, vecB);
}

function alternativesOverlap(fieldsA, fieldsB) {
  const altsA = fieldsA.alternatives || [];
  const altsB = fieldsB.alternatives || [];
  if (altsA.length === 0 && altsB.length === 0) return 0;
  return arrayOverlap(altsA, altsB);
}

export function computeProductStructuredScore(fieldsA, fieldsB) {
  const scores = {};

  scores.primary_category = exactMatch(fieldsA.primary_category, fieldsB.primary_category);
  scores.subjects = arrayOverlap(fieldsA.subjects, fieldsB.subjects);
  scores.age_range = arrayOverlap(fieldsA.age_range, fieldsB.age_range);
  scores.purchase_model = exactMatch(fieldsA.purchase_model, fieldsB.purchase_model);
  scores.send_suitability = exactMatch(fieldsA.send_suitability, fieldsB.send_suitability);
  scores.pedagogy_style = exactMatch(fieldsA.pedagogy_style, fieldsB.pedagogy_style);
  scores.alternatives_overlap = alternativesOverlap(fieldsA, fieldsB);
  scores.impact_profile_similarity = impactProfileSimilarity(fieldsA, fieldsB);

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
