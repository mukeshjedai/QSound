import { NextResponse } from "next/server";
import { audioBlobExists, createDirectUploadUrl, ensureUploadCors, getBooks, saveBooks } from "@/lib/storage";

export const runtime = "nodejs";

type Upload = { id: string; title: string; blobName: string; audioUrl: string };
type IncomingFile = { name: string; type: string; size: number };

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await context.params;
    const body = await request.json();
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

    if (body.action === "prepare") {
      const requestOrigin = request.headers.get("origin");
      const appOrigin = new URL(request.url).origin;
      if (!requestOrigin || requestOrigin !== appOrigin) {
        return NextResponse.json({ error: "Upload requests must come from this application." }, { status: 403 });
      }
      await ensureUploadCors(appOrigin);
      const files: IncomingFile[] = Array.isArray(body.files) ? body.files : [];
      const valid = files.length > 0 && files.every((file) =>
        typeof file.name === "string" && typeof file.type === "string" && file.type.startsWith("audio/")
      );
      if (!valid) return NextResponse.json({ error: "Valid audio files are required." }, { status: 400 });
      const remaining = book.totalChapters - book.chapters.length;
      if (files.length > remaining) {
        return NextResponse.json({ error: `This book only has room for ${remaining} more ${remaining === 1 ? "chapter" : "chapters"}.` }, { status: 400 });
      }

      const uploads = await Promise.all(files.map(async (file, index) => {
        const id = crypto.randomUUID();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const blobName = `audio/${bookId}/${id}-${safeName}`;
        return {
          id,
          title: `Chapter ${book.chapters.length + index + 1}`,
          blobName,
          audioUrl: `/api/audio/${blobName.split("/").map(encodeURIComponent).join("/")}`,
          uploadUrl: await createDirectUploadUrl(blobName, file.type)
        };
      }));
      return NextResponse.json({ uploads });
    }

    if (body.action === "finalize") {
      const uploads = (Array.isArray(body.uploads) ? body.uploads : []) as Upload[];
      const validPrefix = `audio/${bookId}/`;
      if (!uploads.length || uploads.some((item) =>
        !item.id || !item.title || !item.blobName?.startsWith(validPrefix) || !item.audioUrl
      )) return NextResponse.json({ error: "Invalid upload details." }, { status: 400 });
      if (book.chapters.length + uploads.length > book.totalChapters) {
        return NextResponse.json({ error: "The book no longer has enough chapter slots." }, { status: 409 });
      }
      const existence = await Promise.all(uploads.map((item) => audioBlobExists(item.blobName)));
      if (existence.some((exists) => !exists)) {
        return NextResponse.json({ error: "One or more audio uploads did not finish." }, { status: 409 });
      }
      const createdAt = new Date().toISOString();
      book.chapters.push(...uploads.map((item) => ({ ...item, createdAt })));
      await saveBooks(books);
      return NextResponse.json({ chapters: uploads }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown upload action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process upload" }, { status: 500 });
  }
}
