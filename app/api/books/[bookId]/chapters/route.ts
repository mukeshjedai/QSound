import { NextResponse } from "next/server";
import { getBooks, saveBooks, uploadAudio } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await context.params;
    const data = await request.formData();
    const title = String(data.get("title") || "").trim();
    const file = data.get("audio");
    if (!title || !(file instanceof File) || !file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "A chapter title and audio file are required." }, { status: 400 });
    }
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    if (book.chapters.length >= book.totalChapters) {
      return NextResponse.json({ error: "This book already has all of its chapters." }, { status: 400 });
    }
    const chapterId = crypto.randomUUID();
    const uploaded = await uploadAudio(bookId, chapterId, file);
    const chapter = { id: chapterId, title, ...uploaded, createdAt: new Date().toISOString() };
    book.chapters.push(chapter);
    await saveBooks(books);
    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload chapter" }, { status: 500 });
  }
}
