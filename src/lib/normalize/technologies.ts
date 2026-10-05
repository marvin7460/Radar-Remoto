import { stripAccents } from "./text";

interface Tech {
  name: string;
  /** URL slug for the per-technology pages. */
  slug: string;
  /** Spellings found in tags and titles ("node-js", "Node.js", "nodejs"). */
  aliases: string[];
  /**
   * Spellings that are safe to look for in prose. Defaults to `aliases`.
   * `false` for words that also mean something else ("Go", "Spring", "Swift").
   */
  inText?: string[] | false;
  /** Match `inText` with exact casing ("React" yes, "react quickly" no). */
  caseSensitiveInText?: boolean;
}

const TECHNOLOGIES: Tech[] = [
  {
    name: "JavaScript",
    slug: "javascript",
    aliases: ["javascript", "js", "es6", "ecmascript"],
    inText: ["javascript"],
  },
  { name: "TypeScript", slug: "typescript", aliases: ["typescript", "ts"], inText: ["typescript"] },
  {
    name: "React",
    slug: "react",
    aliases: ["react", "reactjs", "react.js"],
    inText: ["React", "ReactJS", "React.js"],
    caseSensitiveInText: true,
  },
  { name: "React Native", slug: "react-native", aliases: ["react native", "reactnative"] },
  { name: "Next.js", slug: "nextjs", aliases: ["next.js", "nextjs", "next"], inText: ["next.js", "nextjs"] },
  { name: "Vue.js", slug: "vue", aliases: ["vue", "vuejs", "vue.js"] },
  { name: "Nuxt", slug: "nuxt", aliases: ["nuxt", "nuxtjs", "nuxt.js"] },
  { name: "Angular", slug: "angular", aliases: ["angular", "angularjs"] },
  { name: "Svelte", slug: "svelte", aliases: ["svelte", "sveltekit"] },
  { name: "Node.js", slug: "nodejs", aliases: ["node.js", "nodejs", "node"] },
  {
    name: "Express",
    slug: "express",
    aliases: ["express", "expressjs", "express.js"],
    inText: ["express.js", "expressjs"],
  },
  { name: "NestJS", slug: "nestjs", aliases: ["nestjs", "nest.js"] },
  { name: "Python", slug: "python", aliases: ["python", "python3"] },
  { name: "Django", slug: "django", aliases: ["django"] },
  { name: "Flask", slug: "flask", aliases: ["flask"] },
  { name: "FastAPI", slug: "fastapi", aliases: ["fastapi"] },
  { name: "Java", slug: "java", aliases: ["java"] },
  {
    name: "Spring",
    slug: "spring",
    aliases: ["spring", "spring boot", "springboot"],
    inText: ["spring boot"],
  },
  { name: "Kotlin", slug: "kotlin", aliases: ["kotlin"] },
  { name: "Swift", slug: "swift", aliases: ["swift", "swiftui"], inText: ["swiftui"] },
  { name: "iOS", slug: "ios", aliases: ["ios"] },
  { name: "Android", slug: "android", aliases: ["android"] },
  { name: "Flutter", slug: "flutter", aliases: ["flutter"] },
  { name: "Dart", slug: "dart", aliases: ["dart"], inText: false },
  { name: "Go", slug: "go", aliases: ["golang", "go"], inText: ["golang"] },
  { name: "Rust", slug: "rust", aliases: ["rust"], inText: false },
  { name: "C#", slug: "csharp", aliases: ["c#", "csharp"] },
  { name: ".NET", slug: "dotnet", aliases: [".net", "dotnet", "net core", "asp.net", "aspnet"] },
  { name: "C++", slug: "cpp", aliases: ["c++", "cpp"] },
  { name: "Ruby", slug: "ruby", aliases: ["ruby"] },
  {
    name: "Ruby on Rails",
    slug: "rails",
    aliases: ["ruby on rails", "rails", "ror"],
    inText: ["ruby on rails", "rails"],
  },
  { name: "PHP", slug: "php", aliases: ["php"] },
  { name: "Laravel", slug: "laravel", aliases: ["laravel"] },
  { name: "WordPress", slug: "wordpress", aliases: ["wordpress"] },
  { name: "Shopify", slug: "shopify", aliases: ["shopify"] },
  { name: "Elixir", slug: "elixir", aliases: ["elixir"] },
  { name: "Scala", slug: "scala", aliases: ["scala"], inText: false },
  { name: "SQL", slug: "sql", aliases: ["sql"] },
  { name: "PostgreSQL", slug: "postgresql", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", slug: "mysql", aliases: ["mysql", "mariadb"] },
  { name: "SQL Server", slug: "sql-server", aliases: ["sql server", "mssql"] },
  { name: "MongoDB", slug: "mongodb", aliases: ["mongodb", "mongo"] },
  { name: "Redis", slug: "redis", aliases: ["redis"] },
  { name: "GraphQL", slug: "graphql", aliases: ["graphql"] },
  { name: "AWS", slug: "aws", aliases: ["aws", "amazon web services"] },
  { name: "Google Cloud", slug: "gcp", aliases: ["gcp", "google cloud"] },
  { name: "Azure", slug: "azure", aliases: ["azure"] },
  { name: "Docker", slug: "docker", aliases: ["docker"] },
  { name: "Kubernetes", slug: "kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform", slug: "terraform", aliases: ["terraform"] },
  { name: "Linux", slug: "linux", aliases: ["linux"] },
  { name: "HTML", slug: "html", aliases: ["html", "html5"] },
  { name: "CSS", slug: "css", aliases: ["css", "css3"] },
  { name: "Tailwind CSS", slug: "tailwind", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Sass", slug: "sass", aliases: ["sass", "scss"] },
  { name: "Jest", slug: "jest", aliases: ["jest"] },
  { name: "Cypress", slug: "cypress", aliases: ["cypress"] },
  { name: "Playwright", slug: "playwright", aliases: ["playwright"] },
  { name: "Selenium", slug: "selenium", aliases: ["selenium"] },
  { name: "Pandas", slug: "pandas", aliases: ["pandas"] },
  {
    name: "Spark",
    slug: "spark",
    aliases: ["spark", "pyspark", "apache spark"],
    inText: ["pyspark", "apache spark"],
  },
  { name: "Airflow", slug: "airflow", aliases: ["airflow"] },
  { name: "dbt", slug: "dbt", aliases: ["dbt"] },
  { name: "Power BI", slug: "power-bi", aliases: ["power bi", "powerbi"] },
  { name: "Tableau", slug: "tableau", aliases: ["tableau"] },
  { name: "TensorFlow", slug: "tensorflow", aliases: ["tensorflow"] },
  { name: "PyTorch", slug: "pytorch", aliases: ["pytorch"] },
  { name: "Salesforce", slug: "salesforce", aliases: ["salesforce", "apex"], inText: ["salesforce"] },
  { name: "SAP", slug: "sap", aliases: ["sap", "abap"], inText: ["SAP", "ABAP"], caseSensitiveInText: true },
  { name: "OutSystems", slug: "outsystems", aliases: ["outsystems"] },
  { name: "Unity", slug: "unity", aliases: ["unity", "unity3d"], inText: ["unity3d"] },
  { name: "Solidity", slug: "solidity", aliases: ["solidity"] },
  { name: "Kafka", slug: "kafka", aliases: ["kafka"] },
];

/** "Node.js" / "node-js" / "NODE JS" → "nodejs". Keeps "#" and "+" (C#, C++). */
const tagKey = (text: string) => stripAccents(text.toLowerCase()).replace(/[\s._-]+/g, "");

const BY_TAG = new Map(
  TECHNOLOGIES.flatMap((tech) => tech.aliases.map((alias) => [tagKey(alias), tech] as const)),
);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textPattern = (aliases: string[], caseSensitive = false) =>
  new RegExp(`(?<![\\w#+.])(?:${aliases.map(escape).join("|")})(?![\\w#+])`, caseSensitive ? "" : "i");

const IN_TITLE = TECHNOLOGIES.map((tech) => ({
  tech,
  // Titles are short and specific, so most aliases are safe there; Go needs care ("Go-to-market").
  pattern: textPattern(
    tech.slug === "go"
      ? ["golang", "go developer", "go engineer"]
      : tech.aliases.filter((a) => a.length > 2 || a === "go"),
  ),
}));
const IN_TEXT = TECHNOLOGIES.filter((tech) => tech.inText !== false).map((tech) => ({
  tech,
  pattern: textPattern(
    (tech.inText as string[] | undefined) ?? tech.aliases.filter((a) => a.length > 2),
    tech.caseSensitiveInText,
  ),
}));

const MAX_TECHNOLOGIES = 10;
/** Longer tag lists are often spam (Remotive tags some jobs with 40+ languages). */
const TRUSTED_TAG_COUNT = 8;
const CONFIRM = new Map(IN_TITLE.map(({ tech, pattern }) => [tech, pattern]));

/**
 * Canonical technology names for a job, from (in order of trust) the title,
 * the source's tags and the description. Unknown tags are dropped so filters
 * stay clean ("remote", "full-time", "senior" are tags too). When a source
 * sends a long tag list, a tag only counts if the text mentions it as well.
 */
export function detectTechnologies(tags: readonly string[], title: string, description: string): string[] {
  const found = new Set<string>();
  const add = (tech: Tech | undefined) => tech && found.size < MAX_TECHNOLOGIES && found.add(tech.name);

  for (const { tech, pattern } of IN_TITLE) if (pattern.test(title)) add(tech);

  const tagList = tags.flatMap((t) => t.split(/[,/]|\s+and\s+/)).filter((t) => t.trim());
  const trustTags = tagList.length <= TRUSTED_TAG_COUNT;
  for (const tag of tagList) {
    const tech = BY_TAG.get(tagKey(tag));
    if (tech && (trustTags || CONFIRM.get(tech)?.test(`${title}\n${description}`))) add(tech);
  }

  for (const { tech, pattern } of IN_TEXT) if (pattern.test(description)) add(tech);
  return [...found];
}

export function technologyBySlug(slug: string): string | undefined {
  return TECHNOLOGIES.find((tech) => tech.slug === slug)?.name;
}

export function technologySlug(name: string): string | undefined {
  return TECHNOLOGIES.find((tech) => tech.name === name)?.slug;
}
