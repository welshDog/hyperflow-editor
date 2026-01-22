"use server";

import { SurveyResponseSchema } from "@/survey/zod";
import { createPartial, loadByToken, submitByToken, upsertPartial, listAll, queueResumeEmail } from "@/survey/repo";

export async function submitSurveyResponse(payload: unknown) {
  const parsed = SurveyResponseSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };
  const { token } = await createPartial(parsed.data as Record<string, unknown>);
  const id = await submitByToken(token);
  if (!id) return { ok: false, errors: { formErrors: ["Submit failed"], fieldErrors: {} } };
  return { ok: true, id };
}

export async function createSurveyToken(data: Record<string, unknown>) {
  const parsed = SurveyResponseSchema.partial().safeParse(data);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };
  const res = await createPartial(parsed.data);
  return { ok: true, token: res.token };
}

export async function loadSurveyByToken(token: string) {
  const res = await loadByToken(token);
  if (!res) return { ok: false };
  return { ok: true, data: res.data, status: res.status };
}

export async function savePartialByToken(token: string, patch: Record<string, unknown>) {
  const ok = await upsertPartial(token, patch);
  return { ok };
}

export async function listSurveyResponses() {
  const rows = await listAll();
  return rows;
}

export async function sendResumeEmail(token: string, to: string) {
  const { id } = queueResumeEmail(to, token);
  return { ok: true, id };
}
