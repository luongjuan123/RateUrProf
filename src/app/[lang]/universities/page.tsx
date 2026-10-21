import { redirect } from "next/navigation";

export default async function LocalizedUniversitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; query?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const q = sp.q || sp.query;
  if (q) {
    redirect(`/${lang}?mode=school&q=${encodeURIComponent(q)}`);
  }
  redirect(`/${lang}?mode=school`);
}
