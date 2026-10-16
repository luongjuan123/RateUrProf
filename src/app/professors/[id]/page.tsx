import React from "react";
import ProfessorDetailClient from "./ProfessorDetailClient";
import { INITIAL_PROFESSORS } from "@/lib/initialData";

export const dynamicParams = true;

export function generateStaticParams() {
  return INITIAL_PROFESSORS.map((p) => ({
    id: p.id,
  }));
}

export default async function ProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ProfessorDetailClient professorId={resolvedParams.id} />;
}
