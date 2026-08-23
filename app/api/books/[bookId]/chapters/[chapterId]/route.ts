import { NextResponse } from "next/server";
import { deleteAudio, getBooks, saveBooks } from "@/lib/storage";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  try {
    const { bookId, chapterId } = await context.params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Enter a chapter name between 1 and 120 characters." }, { status: 400 });
    }
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    const chapter = book.chapters.find((item) => item.id === chapterId);
    if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    chapter.title = title;
    await saveBooks(books);
    return NextResponse.json(chapter);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to rename chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  try {
    const { bookId, chapterId } = await context.params;
    const books = await getBooks();
    const book = books.find((item) => item.id === bookId);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

    const chapterIndex = book.chapters.findIndex((item) => item.id === chapterId);
    if (chapterIndex < 0) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    const [chapter] = book.chapters.splice(chapterIndex, 1);
    await deleteAudio(chapter.blobName);
    await saveBooks(books);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete chapter" },
      { status: 500 }
    );
  }
}
