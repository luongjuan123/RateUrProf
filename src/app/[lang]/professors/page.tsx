import { redirect } from "next/navigation";

export default async function LocalizedProfessorsPage({
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
    redirect(`/${lang}?mode=professor&q=${encodeURIComponent(q)}`);
  }
  redirect(`/${lang}`);
}
