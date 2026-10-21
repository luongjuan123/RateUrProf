import React from "react";
import UniversityDetailClient from "./UniversityDetailClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <UniversityDetailClient universityId={resolvedParams.id} />;
}

