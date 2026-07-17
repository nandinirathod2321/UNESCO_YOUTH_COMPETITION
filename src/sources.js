// src/sources.js
// Curated, REAL authoritative sources for grounding verdicts. Short attributions only —
// no long passages. Used to render a "Source: <name>" chip on the fact-check card and in
// chat replies. Optional live web grounding (config.liveGrounding) can override for freeform
// claims, but NEVER fabricates — it falls back to these curated entries or a generic line.

// By category (fallback when no scenario-specific source applies).
export const SOURCES = {
  scam: {
    name: 'Cyber Crime (I4C) · 1930',
    org: 'Indian Cyber Crime Coordination Centre',
    url: 'https://cybercrime.gov.in',
    line: 'Banks and officials never demand secret, urgent transfers or OTPs. Report fraud at 1930 / cybercrime.gov.in.',
  },
  health: {
    name: 'WHO',
    org: 'World Health Organization',
    url: 'https://www.who.int',
    line: 'No food or home remedy cures serious disease; follow a qualified doctor.',
  },
  claim: {
    name: 'PIB Fact Check',
    org: 'Press Information Bureau, Govt. of India',
    url: 'https://pib.gov.in/factcheck.aspx',
    line: 'Verify forwarded claims against official government sources.',
  },
  unsure: {
    name: 'PIB Fact Check',
    org: 'Press Information Bureau, Govt. of India',
    url: 'https://pib.gov.in/factcheck.aspx',
    line: 'Check with an official source before believing or forwarding.',
  },
};

// Scenario-specific, more precise sources for the 3 scripted demos.
export const SCENARIO_SOURCES = {
  A: {
    name: 'Cyber Crime (I4C) · 1930',
    org: 'Indian Cyber Crime Coordination Centre',
    url: 'https://cybercrime.gov.in',
    line: 'Family/hospital emergencies are never handled by secret, rushed money transfers. Verify by calling back; report at 1930.',
  },
  B: {
    name: 'Cancer Research UK',
    org: 'Cancer Research UK',
    url: 'https://www.cancerresearchuk.org/about-cancer/causes-of-cancer/cancer-myths',
    line: 'There is no evidence that lemon water or "alkaline" diets cure or prevent cancer.',
  },
  C: {
    name: 'PIB Fact Check',
    org: 'Press Information Bureau, Govt. of India',
    url: 'https://pib.gov.in/factcheck.aspx',
    line: 'Unverified rumours about rules/benefits should be checked with the official department.',
  },
};

// Pick the best curated source for a result.
export function sourceFor({ sampleId, category } = {}) {
  const id = sampleId ? String(sampleId).toUpperCase() : null;
  if (id && SCENARIO_SOURCES[id]) return SCENARIO_SOURCES[id];
  return SOURCES[String(category || '').toLowerCase()] || SOURCES.unsure;
}
