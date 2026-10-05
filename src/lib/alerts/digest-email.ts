import type { JobRow, SavedSearch } from "@/db/schema";
import { appUrl } from "@/lib/config";
import { escapeHtml, type Email } from "@/lib/email/send";
import { ACCEPTS_MEXICO_LABEL, formatSalary, SENIORITY_LABEL } from "@/lib/format";
import { sourceNames } from "@/lib/sources";
import { unsubscribeToken } from "./unsubscribe";

export interface DigestSection {
  search: SavedSearch;
  jobs: JobRow[];
}

/** Email links go through /r/:id so we can count clicks without tracking pixels or cookies. */
const jobLink = (job: JobRow) => `${appUrl()}/r/${job.id}?via=email`;

export function buildDigestEmail(to: string, sections: DigestSection[]): Email {
  const total = sections.reduce((sum, section) => sum + section.jobs.length, 0);
  // One-click unsubscribe (RFC 8058) for the first alert; each section has its own link too.
  const firstUnsubscribe = `${appUrl()}/api/baja?token=${unsubscribeToken(sections[0].search.id)}`;

  const html = sections
    .map(({ search, jobs }) => {
      const items = jobs
        .map((job) => {
          const meta = [
            job.company,
            SENIORITY_LABEL[job.seniority],
            ACCEPTS_MEXICO_LABEL[job.acceptsMexico],
            formatSalary(job),
            `vía ${sourceNames[job.source] ?? job.source}`,
          ]
            .filter(Boolean)
            .map((part) => escapeHtml(part!))
            .join(" · ");
          return `<li style="margin-bottom:12px"><a href="${escapeHtml(jobLink(job))}" style="font-weight:600;color:#1c1917">${escapeHtml(job.title)}</a><br><span style="color:#57534e;font-size:13px">${meta}</span></li>`;
        })
        .join("");
      const unsubscribe = `${appUrl()}/baja?token=${unsubscribeToken(search.id)}`;
      return `<h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(search.name)}</h2>
<ul style="padding-left:18px">${items}</ul>
<p style="font-size:12px;color:#78716c"><a href="${escapeHtml(`${appUrl()}/${search.query}`)}" style="color:#78716c">Ver la búsqueda</a> · <a href="${escapeHtml(unsubscribe)}" style="color:#78716c">Darme de baja de esta alerta</a></p>`;
    })
    .join("");

  const text = sections
    .map(({ search, jobs }) =>
      [
        `== ${search.name} ==`,
        ...jobs.map(
          (job) =>
            `- ${job.title} (${job.company}, vía ${sourceNames[job.source] ?? job.source})\n  ${jobLink(job)}`,
        ),
        `Darme de baja: ${appUrl()}/baja?token=${unsubscribeToken(search.id)}`,
      ].join("\n"),
    )
    .join("\n\n");

  return {
    to,
    subject:
      total === 1
        ? "1 vacante nueva para ti — Radar Remoto"
        : `${total} vacantes nuevas para ti — Radar Remoto`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px">${html}<p style="font-size:12px;color:#a8a29e;margin-top:32px">Recibes esto porque creaste alertas en <a href="${escapeHtml(appUrl())}" style="color:#a8a29e">Radar Remoto</a>. <a href="${escapeHtml(`${appUrl()}/alertas`)}" style="color:#a8a29e">Administrar alertas</a>.</p></div>`,
    text: `${text}\n\nAdministrar alertas: ${appUrl()}/alertas`,
    headers: {
      "List-Unsubscribe": `<${firstUnsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
