import { redirect } from "next/navigation";

export default async function AdminRootPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const qs = new URLSearchParams({ widok: "dzien" });
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) qs.set("od", date);
  redirect(`/admin/harmonogram?${qs.toString()}`);
}
