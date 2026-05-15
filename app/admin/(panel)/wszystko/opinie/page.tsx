import { redirect } from "next/navigation";
import Link from "next/link";
import { isSessionSuperAdmin } from "@/lib/auth/super-admin";
import { getAllFeedback } from "@/lib/db/super-admin";
import { FeedbackItem } from "./feedback-item";

export const metadata = { title: "Opinie klientów", robots: { index: false } };

type SearchParams = Promise<{ status?: string }>;

export default async function OpiniePage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isSessionSuperAdmin())) redirect("/admin");

  const { status } = await searchParams;
  let feedback = await getAllFeedback();

  if (status && status !== "all") {
    feedback = feedback.filter((f) => f.status === status);
  }

  const counts = {
    all: feedback.length,
    new: feedback.filter((f) => f.status === "new").length,
    read: feedback.filter((f) => f.status === "read").length,
    resolved: feedback.filter((f) => f.status === "resolved").length,
  };

  // When filtering, re-count from unfiltered total
  const allFeedback = await getAllFeedback();
  const totalCounts = {
    all: allFeedback.length,
    new: allFeedback.filter((f) => f.status === "new").length,
    read: allFeedback.filter((f) => f.status === "read").length,
    resolved: allFeedback.filter((f) => f.status === "resolved").length,
  };

  const filters = [
    { key: "all", label: "Wszystkie", count: totalCounts.all },
    { key: "new", label: "Nowe", count: totalCounts.new },
    { key: "read", label: "Przeczytane", count: totalCounts.read },
    { key: "resolved", label: "Rozwiązane", count: totalCounts.resolved },
  ];

  const activeFilter = status ?? "all";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/admin/wszystko"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Panel zarządcy
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Opinie klientów</h1>
        <p className="mt-1 text-sm text-zinc-500">Zgłoszenia i uwagi od użytkowników platformy</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex items-center gap-1 text-xs">
        {filters.map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/admin/wszystko/opinie${key === "all" ? "" : `?status=${key}`}`}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${
              activeFilter === key
                ? "bg-zinc-800 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-1 text-zinc-600">{count}</span>
            )}
          </Link>
        ))}
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-500">
            {activeFilter === "all"
              ? "Brak opinii od klientów."
              : "Brak opinii z tym statusem."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <FeedbackItem key={f.id} feedback={f} />
          ))}
        </div>
      )}
    </div>
  );
}
