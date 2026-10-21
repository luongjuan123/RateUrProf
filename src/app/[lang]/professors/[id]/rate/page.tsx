import React from "react";
import RateProfessorClient from "@/app/professors/[id]/rate/RateProfessorClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function LocalizedRateProfessorPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <RateProfessorClient professorId={resolved.id} />;
}
