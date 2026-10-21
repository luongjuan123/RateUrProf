import { redirect } from "next/navigation";

export default async function RootProfessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; query?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || sp.query;
  if (q) {
    redirect(`/vi?mode=professor&q=${encodeURIComponent(q)}`);
  }
  redirect(`/vi`);
}
