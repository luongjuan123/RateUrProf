import React from "react";
import RateProfessorClient from "./RateProfessorClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function RateProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <RateProfessorClient professorId={resolvedParams.id} />;
}
