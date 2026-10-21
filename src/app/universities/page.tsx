import { redirect } from "next/navigation";

export default async function RootUniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; query?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || sp.query;
  if (q) {
    redirect(`/vi?mode=school&q=${encodeURIComponent(q)}`);
  }
  redirect(`/vi?mode=school`);
}
