"use client";

import { useEffect, useMemo, useState } from "react";
import { surveySpec, SurveyFieldOptions, SurveyFieldNumber } from "@/survey/spec";
import { submitSurveyResponse } from "@/app/actions/survey";

interface FormState {
  [key: string]: unknown;
}

const storageKey = `survey:${surveySpec.id}`;

export default function SurveyForm({ token }: { token?: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      return raw ? (JSON.parse(raw) as FormState) : {};
    } catch {
      return {};
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(token ?? null);
  const [emailQueuedTo, setEmailQueuedTo] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {}
  }, [form]);

  useEffect(() => {
    async function load() {
      if (resumeToken) {
        const { loadSurveyByToken } = await import("@/app/actions/survey");
        const res = await loadSurveyByToken(resumeToken);
        if (res.ok) setForm(res.data as FormState);
      }
    }
    load();
  }, [resumeToken]);

  const currentSection = surveySpec.sections[step];
  const progressText = useMemo(() => `${step + 1} / ${surveySpec.sections.length}`, [step]);
  const progressPct = useMemo(() => Math.round(((step + 1) / surveySpec.sections.length) * 100), [step]);

  function setValue(id: string, value: unknown) {
    setForm((f) => ({ ...f, [id]: value }));
  }

  async function onSubmit() {
    setSubmitting(true);
    setSubmitOk(null);
    setSubmitErr(null);
    const res = await submitSurveyResponse(form);
    setSubmitting(false);
    if (res.ok) {
      setSubmitOk(res.id as string);
    } else {
      setSubmitErr("Validation failed");
    }
  }

  async function onSaveResume() {
    const { createSurveyToken, savePartialByToken, sendResumeEmail } = await import("@/app/actions/survey");
    let tok = resumeToken;
    if (!tok) {
      const res = await createSurveyToken(form);
      if (res.ok) tok = res.token as string;
    }
    if (tok) {
      await savePartialByToken(tok, form);
      setResumeToken(tok);
      const contact = (form["followup_contact"] as string) ?? "";
      const looksEmail = typeof contact === "string" && contact.includes("@") && contact.includes(".");
      if (looksEmail) {
        await sendResumeEmail(tok, contact);
        setEmailQueuedTo(contact);
      }
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{currentSection.title}</h2>
        <span className="text-sm text-neutral-500">{progressText}</span>
      </div>
      <div aria-label="Progress" className="mt-2 h-2 w-full rounded bg-neutral-200">
        <div className="h-2 rounded bg-blue-600" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{currentSection.description}</p>
      <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
        {currentSection.fields.map((field) => {
          const value = form[field.id] as unknown;
          if (field.visibility && form[field.visibility.dependsOn] !== field.visibility.equals) {
            return null;
          }
          if (field.type === "text") {
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-1" htmlFor={field.id}>{field.label}</label>
                <input id={field.id} className="w-full rounded border border-neutral-300 p-2"
                  value={(value as string) ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)} />
              </div>
            );
          }
          if (field.type === "textarea") {
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-1" htmlFor={field.id}>{field.label}</label>
                <textarea id={field.id} className="w-full rounded border border-neutral-300 p-2"
                  rows={5}
                  value={(value as string) ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)} />
              </div>
            );
          }
          if (field.type === "number") {
            const f = field as SurveyFieldNumber;
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-1" htmlFor={field.id}>{field.label}</label>
                <input id={field.id} className="w-full rounded border border-neutral-300 p-2" type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step ?? 1}
                  value={typeof value === "number" ? value : ""}
                  onChange={(e) => setValue(field.id, e.target.value === "" ? undefined : Number(e.target.value))} />
              </div>
            );
          }
          if (field.type === "select") {
            const f = field as SurveyFieldOptions;
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-1" htmlFor={field.id}>{field.label}</label>
                <select id={field.id} className="w-full rounded border border-neutral-300 p-2"
                  value={(value as string) ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)}>
                  <option value="">Select…</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }
          if (field.type === "multiselect" || field.type === "checkbox_group") {
            const f = field as SurveyFieldOptions;
            const arr = Array.isArray(value) ? (value as string[]) : [];
            return (
              <div key={field.id}>
                <div className="block text-sm font-medium mb-1">{field.label}</div>
                <div className="flex flex-wrap gap-3">
                  {f.options.map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={arr.includes(opt)} onChange={(e) => {
                        const next = e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt);
                        setValue(field.id, next);
                      }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {f.allowOtherText && (
                  <input className="mt-2 w-full rounded border border-neutral-300 p-2" placeholder="Other"
                    value={(form[`${field.id}_other`] as string) ?? ""}
                    onChange={(e) => setValue(`${field.id}_other`, e.target.value)} />
                )}
              </div>
            );
          }
          return null;
        })}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className="rounded px-3 py-2 border border-neutral-300" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          {step < surveySpec.sections.length - 1 ? (
            <button type="button" className="rounded px-3 py-2 bg-blue-600 text-white" onClick={() => setStep((s) => Math.min(s + 1, surveySpec.sections.length - 1))}>Next</button>
          ) : (
            <button type="button" className="rounded px-3 py-2 bg-green-600 text-white" disabled={submitting} onClick={onSubmit}>Submit</button>
          )}
          <button type="button" className="rounded px-3 py-2 border border-neutral-300" onClick={onSaveResume}>Save & Resume</button>
        </div>
        {submitOk && <p className="mt-3 text-green-700">Submitted: {submitOk}</p>}
        {submitErr && <p className="mt-3 text-red-600">{submitErr}</p>}
        {resumeToken && (
          <p className="mt-3 text-neutral-700">Resume link: <a className="text-blue-700" href={`/survey?token=${resumeToken}`}>/survey?token={resumeToken}</a></p>
        )}
        {emailQueuedTo && (
          <p className="mt-1 text-neutral-700">Email queued to: {emailQueuedTo}</p>
        )}
      </form>
    </div>
  );
}
