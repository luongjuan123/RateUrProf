import React from "react";
import UniversityDetailClient from "@/app/universities/[id]/UniversityDetailClient";
import { INITIAL_UNIVERSITIES } from "@/lib/initialData";
import { supportedLocales } from "@/locales/config";

export function generateStaticParams() {
  const params: { lang: string; id: string }[] = [];
  for (const lang of supportedLocales) {
    for (const u of INITIAL_UNIVERSITIES) {
      params.push({ lang, id: u.id });
    }
  }
  return params;
}

export default async function LocalizedUniversityPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <UniversityDetailClient universityId={resolved.id} />;
}
