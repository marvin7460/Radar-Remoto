import { stripAccents } from "./text";

// Roles we never want, even inside a "Software" category ("Sales Engineer").
const NON_TECH_TITLE =
  /\b(?:sales|ventas|vendedor|account (?:executive|manager)|accounts? (?:payable|receivable)|business development|bdr|sdr|marketing|seo|copywriter|content|recruit(?:er|ing)|reclutador|talent|recursos humanos|people (?:ops|operations|partner)|customer (?:success|service|support|experience)|atencion al cliente|accountant|contador|accounting|bookkeep(?:er|ing)|payroll|finance|finanzas|legal|lawyer|abogad[oa]|attorney|paralegal|nurse|medical|clinical|assistant|asistente|designer|disenador|product manager|project manager|scrum master|evaluator|annotator|annotation|rater|labeler|ai trainer|transcription|transcriptionist|translator|traductor|linguist|trader|mecanico|leadership|strategist|gtm|go to market|vice president|vp|program manager|risk associate|mechanical|civil engineer|chemical|structural|hvac|reconstruction|biomedical|manufacturing)\b/i;

const TECH_TITLE =
  /\b(?:developer|desarrollador(?:a|\(a\)|\/a)?|dev|devs|engineer(?:ing)?|ingenier[oa](?:\/a|\(a\))?\s+(?:de\s+)?(?:software|datos|sistemas|desarrollo|back-?end|front-?end|full-?stack|qa|devops|cloud|machine learning|ml|ia|ai)|programmer|programador(?:a)?|software|front-?end|back-?end|full-?stack|devops|devsecops|sre|site reliability|qa|quality assurance|tester|test automation|data (?:engineer|scientist|analyst)|cientific[oa] de datos|analista de datos|machine learning|ml engineer|ai engineer|mobile|ios|android|flutter|web|cloud|sysadmin|system administrator|dba|database administrator|tech lead|lider tecnic[oa]|lider tecnologic[oa]|architect|arquitect[oa] de software|it support|soporte (?:tecnico|ti))\b/i;

// Source categories that mean "this is a tech job" (Get on Board, Remotive, Himalayas, Jobicy, WWR, Remote OK tags).
const TECH_CATEGORY =
  /\b(?:programming|software|developer|dev|engineer|engineering|devops|sysadmin|qa|testing|data science|data and analytics|analytics|mobile|front-?end|back-?end|full-?stack|information technology|machine learning|artificial intelligence|cybersecurity|infrastructure)\b/i;

/**
 * Radar Remoto is for developers, but every source mixes in sales, support
 * and finance roles. The title decides first (it's the most reliable signal);
 * the source's category only breaks ties when the title says nothing.
 */
export function isTechRole(title: string, categories: readonly string[]): boolean {
  const text = stripAccents(title);
  if (NON_TECH_TITLE.test(text)) return false;
  if (TECH_TITLE.test(text)) return true;
  return categories.some((category) => TECH_CATEGORY.test(stripAccents(category)));
}
