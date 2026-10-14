import { completeAdminAssistant } from "../src/lib/ai.ts";

const original = globalThis.fetch;
const seen: { user: string }[] = [];
globalThis.fetch = (async (_url: string, init: { body?: string }) => {
  const body = JSON.parse(String(init?.body || "{}"));
  const users = (body.messages || [])
    .filter((item: { role: string }) => item.role === "user")
    .map((item: { content: string }) => item.content);
  seen.push({ user: users.join(" || ") });
  return new Response(
    JSON.stringify({
      model: "mock",
      choices: [{ message: { content: "MOCK_OK" } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}) as typeof fetch;

const blank = await completeAdminAssistant({
  query: "   ",
  key: "sk-mock-probe",
  locale: "uz",
});
const history = await completeAdminAssistant({
  query: "Formula nima?",
  key: "sk-mock-probe",
  locale: "uz",
  history: [
    { role: "user", text: "Formula nima?" },
    { role: "assistant", text: "H2O." },
    { role: "user", text: "Formula nima?" },
  ],
});
globalThis.fetch = original;
console.log(
  JSON.stringify({
    blankError: "error" in blank ? blank.error : "ok",
    historyUsers: seen[0]?.user || "",
    historyOk: "ok" in history ? history.ok : false,
  }),
);
