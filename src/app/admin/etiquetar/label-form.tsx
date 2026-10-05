"use client";

import { useEffect, useState, useTransition } from "react";
import type { AcceptsMexico, Seniority } from "@/db/schema";
import { saveLabel, skipJob } from "../actions";

const SENIORITY_OPTIONS: Array<[Seniority, string, string]> = [
  ["junior", "Junior", "1"],
  ["mid", "Semi senior", "2"],
  ["senior", "Senior", "3"],
  ["unknown", "No dice", "0"],
];
const MEXICO_OPTIONS: Array<[AcceptsMexico, string, string]> = [
  ["yes", "Sí", "s"],
  ["no", "No", "n"],
  ["unknown", "No dice", "u"],
];

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-sm ${
    active
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
  }`;

/**
 * Keyboard-first: 1/2/3/0 for the level, s/n/u for Mexico, Enter saves,
 * Escape skips. The classifier's prediction is never shown here, so it
 * can't bias the labels it is measured against.
 */
export function LabelForm({ jobId }: { jobId: number }) {
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [acceptsMexico, setAcceptsMexico] = useState<AcceptsMexico | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = seniority !== null && acceptsMexico !== null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || pending) return;
      const level = SENIORITY_OPTIONS.find(([, , key]) => key === event.key);
      const mexico = MEXICO_OPTIONS.find(([, , key]) => key === event.key.toLowerCase());
      if (level) setSeniority(level[0]);
      else if (mexico) setAcceptsMexico(mexico[0]);
      else if (event.key === "Enter" && seniority && acceptsMexico) {
        startTransition(() => saveLabel({ jobId, seniority, acceptsMexico }));
      } else if (event.key === "Escape") startTransition(() => skipJob());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jobId, seniority, acceptsMexico, pending]);

  return (
    <div className="space-y-3 rounded-lg bg-stone-100 p-4 dark:bg-stone-900">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Qué nivel pide?</legend>
        <div className="flex flex-wrap gap-2">
          {SENIORITY_OPTIONS.map(([value, label, key]) => (
            <button
              key={value}
              type="button"
              aria-pressed={seniority === value}
              className={chip(seniority === value)}
              onClick={() => setSeniority(value)}
            >
              {label} <kbd className="ml-1 opacity-60">{key}</kbd>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Puede aplicar alguien desde México?</legend>
        <div className="flex flex-wrap gap-2">
          {MEXICO_OPTIONS.map(([value, label, key]) => (
            <button
              key={value}
              type="button"
              aria-pressed={acceptsMexico === value}
              className={chip(acceptsMexico === value)}
              onClick={() => setAcceptsMexico(value)}
            >
              {label} <kbd className="ml-1 opacity-60">{key}</kbd>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => ready && startTransition(() => saveLabel({ jobId, seniority, acceptsMexico }))}
          className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
        >
          Guardar <kbd className="ml-1 opacity-60">Enter</kbd>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => skipJob())}
          className="rounded-lg px-4 py-2 text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          Saltar <kbd className="ml-1 opacity-60">Esc</kbd>
        </button>
      </div>
    </div>
  );
}
