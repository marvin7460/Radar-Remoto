/** Whether a place includes Mexico: yes, no, or "it depends on who wrote it". */
export type IncludesMexico = "yes" | "no" | "maybe";

export interface Place {
  code: string;
  /** Spanish label shown in the UI. */
  label: string;
  includesMexico: IncludesMexico;
  /** Matched against accent-free text. Codes like "US" or "EU" are case-sensitive on purpose. */
  patterns: RegExp[];
}

const words = (list: string) => new RegExp(`\\b(?:${list})\\b`, "i");

export const PLACES: Place[] = [
  {
    code: "WORLDWIDE",
    label: "Todo el mundo",
    includesMexico: "yes",
    patterns: [
      words("world ?wide|anywhere|global(?:ly)?|international|todo el mundo|cualquier (?:lugar|parte|pais)"),
    ],
  },
  {
    code: "LATAM",
    label: "Latinoamérica",
    includesMexico: "yes",
    patterns: [words("latam|lat am|latin ?america|latinoamerica|america latina|hispanoamerica")],
  },
  {
    code: "AMERICAS",
    label: "América",
    includesMexico: "yes",
    patterns: [words("americas|north (?:and|&) south america")],
  },
  {
    code: "MX",
    label: "México",
    includesMexico: "yes",
    patterns: [
      words("mexico|mexican[oa]?|cdmx|guadalajara|monterrey|queretaro|puebla|merida|tijuana"),
      /\bMX\b/,
      /🇲🇽/u,
    ],
  },
  // UN geoscheme: "Northern America" is the US, Canada, Bermuda and Greenland.
  {
    code: "NORTHERN_AMERICA",
    label: "EE. UU. y Canadá",
    includesMexico: "no",
    patterns: [words("northern america")],
  },
  {
    code: "NORTH_AMERICA",
    label: "Norteamérica",
    includesMexico: "maybe",
    patterns: [words("north america|norteamerica|america del norte")],
  },
  {
    code: "CENTRAL_AMERICA",
    label: "Centroamérica",
    includesMexico: "no",
    patterns: [words("central america|centroamerica|america central")],
  },
  {
    code: "SOUTH_AMERICA",
    label: "Sudamérica",
    includesMexico: "no",
    patterns: [words("south america|sudamerica|suramerica|america del sur")],
  },
  {
    code: "US",
    label: "Estados Unidos",
    includesMexico: "no",
    patterns: [
      words("usa|united states(?: of america)?|estados unidos|ee\\.? ?uu|us[- ]only|us[- ]based"),
      /\bU\.?S\.?(?![A-Za-z])/,
      /🇺🇸/u,
      words(
        "alabama|alaska|arizona|california|colorado|florida|illinois|massachusetts|michigan|new york|ohio|oregon|pennsylvania|texas|virginia|washington|san francisco|seattle|boston|chicago|austin|denver|atlanta|miami|cincinnati|columbus",
      ),
      /, (?:CA|NY|TX|FL|WA|MA|IL|IN|OH|CO|GA|NC|VA|PA|NJ|OR|AZ|MI|MN|UT|DC)\b/,
    ],
  },
  {
    code: "CA",
    label: "Canadá",
    includesMexico: "no",
    patterns: [words("canada|toronto|vancouver|montreal"), /🇨🇦/u],
  },
  {
    code: "UK",
    label: "Reino Unido",
    includesMexico: "no",
    patterns: [words("united kingdom|great britain|england|scotland|reino unido|london"), /\bUK\b/, /🇬🇧/u],
  },
  { code: "EMEA", label: "EMEA", includesMexico: "no", patterns: [words("emea")] },
  {
    code: "EUROPE",
    label: "Europa",
    includesMexico: "no",
    patterns: [words("europe|european union|europa|schengen"), /\b(?:EU|EEA)\b/],
  },
  {
    code: "APAC",
    label: "Asia-Pacífico",
    includesMexico: "no",
    patterns: [words("apac|asia|asia[- ]pacific|oceania")],
  },
  {
    code: "AFRICA_MIDDLE_EAST",
    label: "África y Medio Oriente",
    includesMexico: "no",
    patterns: [words("africa|middle east|mena")],
  },
  { code: "AR", label: "Argentina", includesMexico: "no", patterns: [words("argentina|buenos aires")] },
  {
    code: "BR",
    label: "Brasil",
    includesMexico: "no",
    patterns: [words("bra[sz]il|sao paulo|rio de janeiro")],
  },
  { code: "CL", label: "Chile", includesMexico: "no", patterns: [words("chile|santiago")] },
  { code: "CO", label: "Colombia", includesMexico: "no", patterns: [words("colombia|bogota|medellin")] },
  { code: "PE", label: "Perú", includesMexico: "no", patterns: [words("peru|lima")] },
  { code: "UY", label: "Uruguay", includesMexico: "no", patterns: [words("uruguay|montevideo")] },
  {
    code: "OTHER_LATAM",
    label: "Otro país de Latinoamérica",
    includesMexico: "no",
    patterns: [
      words(
        "paraguay|bolivia|ecuador|venezuela|costa rica|guatemala|panama|honduras|el salvador|nicaragua|dominican republic|republica dominicana|puerto rico|cuba",
      ),
    ],
  },
  {
    code: "OTHER",
    label: "Otro país",
    includesMexico: "no",
    patterns: [
      words(
        "spain|espana|portugal|germany|alemania|france|francia|italy|italia|netherlands|belgium|austria|switzerland|ireland|poland|sweden|norway|denmark|finland|estonia|lithuania|latvia|czechia|romania|bulgaria|greece|croatia|serbia|ukraine|turkey|turkiye|israel|india|pakistan|philippines|indonesia|vietnam|thailand|malaysia|singapore|japan|china|korea|australia|new zealand|nigeria|kenya|egypt|united arab emirates|uae|dubai|berlin|madrid|lisbon|paris|amsterdam|helsinki|sofia|melbourne|sydney",
      ),
    ],
  },
];
