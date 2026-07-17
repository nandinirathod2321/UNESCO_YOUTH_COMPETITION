// src/samples.js
// Canonical metadata for the 3 scripted demo scenarios (A / B / C).
//
// This is the single source of truth for:
//   - the Gujarati INPUT text (used by scripts/seed.js to synthesize the forwarded voice note)
//   - the canonical LLM result (used as the deterministic cached bundle for filming)
//   - the English subtitle line shown under the reply in the web UI
//
// The `caption`/`subtitle_en` fields are added by the app layer on purpose, so prompt.txt
// stays exactly as written (its JSON schema is unchanged).

export const SAMPLES = {
  A: {
    id: 'A',
    label: 'Accident emergency (scam)',
    // Given verbatim in the brief:
    inputText:
      'બેટા, હું હોસ્પિટલમાં છું, અકસ્માત થયો છે. કોઈને કહેતો નહીં, જલ્દી ₹40,000 આ નંબર પર મોકલ. ફોન કપાઈ રહ્યો છે...',
    result: {
      transcript:
        'બેટા, હું હોસ્પિટલમાં છું, અકસ્માત થયો છે. કોઈને કહેતો નહીં, જલ્દી ₹40,000 આ નંબર પર મોકલ. ફોન કપાઈ રહ્યો છે...',
      verdict: 'scam',
      category: 'scam',
      tactic: 'ઉતાવળ અને ગુપ્તતા (તાત્કાલિક પૈસા માંગવા, કોઈને ન કહેવાનું દબાણ)',
      reply_gujarati:
        'સાવધાન રહો! આ સંદેશ છેતરપિંડી હોઈ શકે છે. ઠગ લોકો "અકસ્માત થયો છે, જલ્દી પૈસા મોકલ, કોઈને કહેતા નહીં" એવું કહીને ઉતાવળ અને ડર ઊભો કરે છે, જેથી તમે વિચાર્યા વગર પૈસા મોકલી દો. પૈસા મોકલતા પહેલાં ફોન મૂકી દો અને તમારા દીકરા કે ઘરના સભ્યને જાતે ફોન કરીને ખાતરી કરો.',
      confidence: 'high',
    },
    subtitle_en:
      'Likely a scam — it uses panic and secrecy to rush you into paying. Before sending any money, hang up and call your family member directly to check.',
  },

  B: {
    id: 'B',
    label: 'Lemon water cures cancer (health myth)',
    inputText:
      'સાંભળ્યું છે કે રોજ સવારે ખાલી પેટે લીંબુ અને ગરમ પાણી પીવાથી કેન્સર મટી જાય છે. દવા બંધ કરીને આ ઉપાય કરો, ડોક્ટરની જરૂર નથી.',
    result: {
      transcript:
        'સાંભળ્યું છે કે રોજ સવારે ખાલી પેટે લીંબુ અને ગરમ પાણી પીવાથી કેન્સર મટી જાય છે. દવા બંધ કરીને આ ઉપાય કરો, ડોક્ટરની જરૂર નથી.',
      verdict: 'false',
      category: 'health',
      tactic: 'ચમત્કારિક ઈલાજનો ખોટો દાવો (દવા બંધ કરાવવાનું જોખમી સૂચન)',
      reply_gujarati:
        'આ વાત સાચી નથી. લીંબુ અને ગરમ પાણી પીવું સ્વાસ્થ્ય માટે સારું છે, પણ એ કેન્સર જેવી ગંભીર બીમારી મટાડી શકતું નથી. આવા "ચમત્કારિક ઈલાજ"ના સંદેશા ખોટા હોય છે. ડોક્ટરની દવા ક્યારેય જાતે બંધ ન કરો — પહેલાં તમારા ડોક્ટરને પૂછો.',
      confidence: 'high',
    },
    subtitle_en:
      'False — lemon water does not cure cancer. Never stop prescribed medicine because of a forwarded message; ask your doctor first.',
  },

  C: {
    id: 'C',
    label: 'Pension rumour (unsure)',
    inputText:
      'સાંભળ્યું છે કે આવતા મહિનેથી પેન્શનના નિયમો બદલાઈ રહ્યા છે, બધા સાવધાન રહેજો.',
    result: {
      transcript:
        'સાંભળ્યું છે કે આવતા મહિનેથી પેન્શનના નિયમો બદલાઈ રહ્યા છે, બધા સાવધાન રહેજો.',
      verdict: 'unsure',
      category: 'unsure',
      tactic: 'અધૂરી અને અસ્પષ્ટ માહિતી (સ્રોત વગરની અફવા)',
      reply_gujarati:
        'માફ કરશો, આ સંદેશ વિશે હું ખાતરીપૂર્વક કંઈ કહી શકતો નથી. તેમાં પૂરતી અને સ્પષ્ટ માહિતી નથી. કૃપા કરીને કોઈ ભરોસાપાત્ર સરકારી કચેરી, બેંક કે ઘરના જાણકાર સભ્યને પૂછીને ખાતરી કરો — અફવા પર ભરોસો ન કરો.',
      confidence: 'low',
    },
    subtitle_en:
      "Not sure — the message is vague and can't be verified. Please check with an official office or a trusted family member before believing or forwarding it.",
  },
};

export const SAMPLE_IDS = Object.keys(SAMPLES);

export function getSample(id) {
  return SAMPLES[String(id || '').toUpperCase()] || null;
}
