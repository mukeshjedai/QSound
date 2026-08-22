import { NextResponse } from "next/server";
import { getBooks, saveBooks, uploadAudio } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await context.params;
    const data = await request.formData();
    const files = data.getAll("audio").filter((item): item is File => item instanceof File);
    if (!files.length || files.some((file) => !file.type.startsWith("audio/"))) {
      return NextResponse.json({ error: "One or more valid audio files are required." }, { status: 400 });
    }
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    const remaining = book.totalChapters - book.chapters.length;
    if (files.length > remaining) {
      return NextResponse.json({ error: `This book only has room for ${remaining} more ${remaining === 1 ? "chapter" : "chapters"}.` }, { status: 400 });
    }

    const firstChapterNumber = book.chapters.length + 1;
    const chapters = [];
    for (const [index, file] of files.entries()) {
      const chapterId = crypto.randomUUID();
      const uploaded = await uploadAudio(bookId, chapterId, file);
      const chapter = {
        id: chapterId,
        title: `Chapter ${firstChapterNumber + index}`,
        ...uploaded,
        createdAt: new Date().toISOString()
      };
      book.chapters.push(chapter);
      chapters.push(chapter);
    }
    await saveBooks(books);
    return NextResponse.json(chapters, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload chapter" }, { status: 500 });
  }
}
