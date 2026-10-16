import React from "react";
import ProfessorDetailClient from "@/app/professors/[id]/ProfessorDetailClient";
import { INITIAL_PROFESSORS } from "@/lib/initialData";
import { supportedLocales } from "@/locales/config";

export const dynamicParams = true;

export function generateStaticParams() {
  const params: { lang: string; id: string }[] = [];
  for (const lang of supportedLocales) {
    for (const p of INITIAL_PROFESSORS) {
      params.push({ lang, id: p.id });
    }
  }
  return params;
}

export default async function LocalizedProfessorPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <ProfessorDetailClient professorId={resolved.id} />;
}
