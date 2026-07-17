// src/present.js
// Presentation helpers shared by BOTH interfaces (web UI + WhatsApp), so the verdict pill
// and the composed WhatsApp caption come from one place.

// Map a category + tactic to the coloured pill shown under the reply.
//   scam          -> muted-amber pill naming the tactic
//   health/claim  -> soft-green "verified" pill + grey "PIB Fact Check" chip
//   unsure/other  -> neutral grey pill, NO verdict claim
export function formatPill(category, tactic) {
  const c = String(category || '').toLowerCase();
  if (c === 'scam') {
    return { kind: 'scam', text: `🛡️ છેતરપિંડીની યુક્તિ: ${tactic}`, chip: null };
  }
  if (c === 'health' || c === 'claim') {
    return { kind: 'verified', text: '✓ વિશ્વસનીય સ્રોતથી ચકાસ્યું', chip: 'PIB Fact Check' };
  }
  return { kind: 'unsure', text: 'ⓘ ખાતરી નથી — કૃપા કરીને જાતે ચકાસો', chip: null };
}

// The text message body sent alongside the reply voice note on WhatsApp:
// spoken reply + the pill line (+ chip) + the English gloss.
export function composeWhatsappText(bundle) {
  const pill = bundle.pill || formatPill(bundle.category, bundle.tactic);
  const pillLine = pill.chip ? `${pill.text} · ${pill.chip}` : pill.text;
  const parts = [bundle.reply_gujarati, pillLine];
  if (bundle.subtitle_en) parts.push(bundle.subtitle_en);
  if (bundle.citation) parts.push(`📌 Source: ${bundle.citation.name} — ${bundle.citation.line}`);
  return parts.join('\n\n');
}
