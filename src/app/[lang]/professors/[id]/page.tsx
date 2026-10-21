import React from "react";
import ProfessorDetailClient from "@/app/professors/[id]/ProfessorDetailClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function LocalizedProfessorPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <ProfessorDetailClient professorId={resolved.id} />;
}

