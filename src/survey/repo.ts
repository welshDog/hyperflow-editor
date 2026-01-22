import { getPrisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabaseServer";
import { surveySpec } from "./spec";

type MemoryResponse = {
  id: string;
  token?: string;
  status: "partial" | "submitted";
  createdAt: number;
  updatedAt: number;
  data: Record<string, unknown>;
};

const mem: MemoryResponse[] = [];

function uuid() {
  return `tok_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

type QueuedEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  token: string;
  createdAt: number;
};

const emails: QueuedEmail[] = [];

type ModelOps = {
  findFirst: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
};

function getModel(name: string): ModelOps | null {
  try {
    const prisma = getPrisma() as unknown as Record<string, unknown>;
    const m = prisma[name] as unknown;
    if (m && typeof m === "object") {
      const ops = m as Record<string, unknown>;
      const api: ModelOps = {
        findFirst: (ops["findFirst"] as (a: unknown) => Promise<unknown>) ?? (async () => null),
        create: ops["create"] as (a: unknown) => Promise<unknown>,
        findMany: ops["findMany"] as (a: unknown) => Promise<unknown>,
        update: ops["update"] as (a: unknown) => Promise<unknown>,
        upsert: ops["upsert"] as (a: unknown) => Promise<unknown>,
      };
      return api;
    }
    return null;
  } catch {
    return null;
  }
}

export async function ensureSurvey() {
  const survey = getModel("survey");
  if (!survey) return "mem_survey";
  const existing = (await survey.findFirst({ where: { specId: surveySpec.id, version: surveySpec.version } })) as { id?: string } | null;
  if (existing?.id) return existing.id;
  const created = (await survey.create?.({ data: { specId: surveySpec.id, version: surveySpec.version, meta: surveySpec.meta } })) as { id?: string } | null;
  return created?.id ?? "mem_survey";
}

export async function createPartial(data: Record<string, unknown>) {
  const user = await getServerUser();
  const surveyId = await ensureSurvey();
  const token = uuid();
  const response = getModel("surveyResponse");
  const audit = getModel("auditLog");
  try {
    const resp = (await response?.create?.({
      data: {
        surveyId,
        userId: user?.id ?? null,
        token,
        status: "partial",
        anonymity: data["anonymity_preference"] === "Anonymous",
      },
    })) as { id?: string } | null;
    await audit?.create?.({ data: { userId: user?.id ?? null, action: "create_partial", entity: "SurveyResponse", entityId: resp?.id ?? "", diff: data } });
    return { id: resp?.id ?? "", token };
  } catch {
    const now = Date.now();
    const id = `mem_${now}`;
    mem.push({ id, token, status: "partial", createdAt: now, updatedAt: now, data });
    return { id, token };
  }
}

export async function loadByToken(token: string) {
  const response = getModel("surveyResponse");
  const answer = getModel("surveyAnswer");
  try {
    const resp = (await response?.findFirst({ where: { token } })) as { id?: string; status?: string } | null;
    if (!resp?.id) return null;
    const rows = (await answer?.findMany?.({ where: { responseId: resp.id } })) as Array<{ questionId: string; value: unknown }> | null;
    const data: Record<string, unknown> = {};
    (rows ?? []).forEach((a) => (data[a.questionId] = a.value));
    return { id: resp.id, status: (resp.status as "partial" | "submitted") ?? "partial", data };
  } catch {
    const r = mem.find((x) => x.token === token);
    return r ? { id: r.id, status: r.status, data: r.data } : null;
  }
}

export async function upsertPartial(token: string, patch: Record<string, unknown>) {
  const user = await getServerUser();
  const response = getModel("surveyResponse");
  const audit = getModel("auditLog");
  const answer = getModel("surveyAnswer");
  try {
    const resp = (await response?.findFirst({ where: { token } })) as { id?: string } | null;
    if (!resp?.id) return false;
    await audit?.create?.({ data: { userId: user?.id ?? null, action: "update_partial", entity: "SurveyResponse", entityId: resp.id, diff: patch } });
    for (const [questionId, value] of Object.entries(patch)) {
      await answer?.upsert?.({
        where: { responseId_questionId: { responseId: resp.id, questionId } },
        update: { value },
        create: { responseId: resp.id, questionId, value },
      });
    }
    return true;
  } catch {
    const r = mem.find((x) => x.token === token);
    if (!r) return false;
    r.data = { ...r.data, ...patch };
    r.updatedAt = Date.now();
    return true;
  }
}

export async function submitByToken(token: string) {
  const user = await getServerUser();
  const response = getModel("surveyResponse");
  const audit = getModel("auditLog");
  try {
    const resp = (await response?.findFirst({ where: { token } })) as { id?: string } | null;
    if (!resp?.id) return null;
    const updated = (await response?.update?.({ where: { id: resp.id }, data: { status: "submitted" } })) as { id?: string } | null;
    await audit?.create?.({ data: { userId: user?.id ?? null, action: "submit", entity: "SurveyResponse", entityId: resp.id, diff: {} } });
    return updated?.id ?? null;
  } catch {
    const r = mem.find((x) => x.token === token);
    if (!r) return null;
    r.status = "submitted";
    r.updatedAt = Date.now();
    return r.id;
  }
}

export async function listAll() {
  const response = getModel("surveyResponse");
  try {
    const rows = (await response?.findMany?.({ include: { answers: true } })) as Array<{ id: string; createdAt: Date; answers: Array<{ questionId: string; value: unknown }> }> | null;
    return (rows ?? []).map((r) => ({ id: r.id, createdAt: r.createdAt.getTime(), data: Object.fromEntries(r.answers.map((a) => [a.questionId, a.value])) }));
  } catch {
    return mem.map((r) => ({ id: r.id, createdAt: r.createdAt, data: r.data }));
  }
}

export function queueResumeEmail(to: string, token: string) {
  const id = `mail_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const resumeUrl = `/survey?token=${token}`;
  const subject = "Your survey resume link";
  const body = `Resume your survey here: ${resumeUrl}`;
  emails.push({ id, to, subject, body, token, createdAt: Date.now() });
  getServerUser()
    .then((user) => {
      try {
        const audit = getModel("auditLog");
        return audit?.create?.({ data: { userId: user?.id ?? null, action: "email_queued", entity: "SurveyResponse", entityId: token, diff: { to, subject } } });
      } catch {
        return null;
      }
    })
    .catch(() => null);
  return { id };
}

export function listQueuedEmails() {
  return emails.slice();
}
