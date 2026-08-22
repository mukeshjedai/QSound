export type Chapter = {
  id: string;
  title: string;
  audioUrl: string;
  blobName: string;
  createdAt: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  chapters: Chapter[];
  createdAt: string;
  accent: string;
};
