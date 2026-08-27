import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const OPENAI_URL = "https://api.openai.com/v1";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const bookPlans = [
  { id: "concepts", title: "अवधारणाओं की पुस्तक", instruction: "स्रोत में मौजूद सभी मुख्य और सहायक अवधारणाओं को क्रमबद्ध अध्यायों में समझाइए। हर अवधारणा के लिए सहज व्याख्या, संदर्भ, उदाहरण, आपसी संबंध और संक्षिप्त पुनरावलोकन दें।" },
  { id: "passages", title: "अंशों की व्याख्या", instruction: "स्रोत के सभी महत्वपूर्ण अंशों और खंडों को उनके मूल क्रम में समझाइए। हर खंड का आशय, संदर्भ, तर्क, निहितार्थ और सरल हिंदी में व्याख्या दें। लंबे मूल उद्धरण न दोहराएँ।" },
  { id: "terms", title: "शब्दावली और पारिभाषिक कोश", instruction: "स्रोत के सभी महत्वपूर्ण शब्दों, नामों, संक्षेपों और पारिभाषिक पदों की विस्तृत हिंदी शब्दावली बनाइए। देवनागरी रूप, मूल शब्द, सरल अर्थ, स्रोत-संदर्भ और जहाँ उपयोगी हो वहाँ उदाहरण दें।" }
] as const;

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function openAIError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error?.message || `OpenAI request failed (${response.status}).`;
}

async function uploadPdf(file: File, apiKey: string) {
  const form = new FormData();
  form.set("purpose", "user_data");
  form.set("file", file, file.name);
  const response = await fetch(`${OPENAI_URL}/files`, { method: "POST", headers: authHeaders(apiKey), body: form });
  if (!response.ok) throw new Error(await openAIError(response));
  return String((await response.json()).id);
}

type PdfSource = { type: "input_file"; file_id?: string; file_url?: string };

async function generateBook(source: PdfSource, plan: (typeof bookPlans)[number], apiKey: string) {
  const response = await fetch(`${OPENAI_URL}/responses`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      max_output_tokens: 12000,
      input: [{ role: "user", content: [
        source,
        { type: "input_text", text: `इस PDF के आधार पर “${plan.title}” लिखिए। ${plan.instruction}\n\nपूरा लेखन स्वाभाविक, स्पष्ट हिंदी में हो। Markdown का प्रयोग करें, शुरुआत उपयुक्त शीर्षक और संक्षिप्त भूमिका से करें, विषयानुसार अध्याय बनाएँ और अंत में सार दें। केवल स्रोत पर आधारित रहें; स्रोत में न होने वाली बातें तथ्य की तरह न जोड़ें।` }
      ] }]
    })
  });
  if (!response.ok) throw new Error(await openAIError(response));
  const data = await response.json();
  const content = data.output_text || data.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).filter((item: { type?: string }) => item.type === "output_text").map((item: { text?: string }) => item.text || "").join("\n");
  if (!content) throw new Error(`OpenAI did not return content for ${plan.title}.`);
  return { id: plan.id, title: plan.title, content };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 503 });

  let uploadedFileId: string | undefined;
  try {
    const form = await request.formData();
    const fileValue = form.get("file");
    const file = fileValue instanceof File && fileValue.size ? fileValue : null;
    const pdfUrl = String(form.get("pdfUrl") || "").trim();
    if (!file && !pdfUrl) return NextResponse.json({ error: "Choose a PDF file or enter a public PDF URL." }, { status: 400 });
    if (file && file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "The PDF must be 20 MB or smaller." }, { status: 400 });
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "The uploaded file must be a PDF." }, { status: 400 });

    let source: PdfSource;
    if (file) {
      uploadedFileId = await uploadPdf(file, apiKey);
      source = { type: "input_file", file_id: uploadedFileId };
    } else {
      const url = new URL(pdfUrl);
      if (!(["http:", "https:"].includes(url.protocol))) throw new Error("The PDF URL must begin with http:// or https://.");
      source = { type: "input_file", file_url: url.toString() };
    }

    return NextResponse.json({ books: await Promise.all(bookPlans.map((plan) => generateBook(source, plan, apiKey))) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the Hindi books." }, { status: 500 });
  } finally {
    if (uploadedFileId) await fetch(`${OPENAI_URL}/files/${uploadedFileId}`, { method: "DELETE", headers: authHeaders(apiKey) }).catch(() => undefined);
  }
}
