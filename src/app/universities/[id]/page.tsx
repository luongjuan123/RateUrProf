import React from "react";
import UniversityDetailClient from "./UniversityDetailClient";
import { INITIAL_UNIVERSITIES } from "@/lib/initialData";

export function generateStaticParams() {
  return INITIAL_UNIVERSITIES.map((u) => ({
    id: u.id,
  }));
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <UniversityDetailClient universityId={resolvedParams.id} />;
}
