import AnnouncementBar from "./AnnouncementBar";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AnnouncementBar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Announcement Bar Test Page</h1>
        <p className="mt-4 text-lg text-slate-700">
          This page exists to preview the announcement bar in isolation.
        </p>
      </main>
    </div>
  );
}
