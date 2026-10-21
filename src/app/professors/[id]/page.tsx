import React from "react";
import ProfessorDetailClient from "./ProfessorDetailClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function ProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ProfessorDetailClient professorId={resolvedParams.id} />;
}

