import React from "react";
import UniversityDetailClient from "@/app/universities/[id]/UniversityDetailClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function LocalizedUniversityPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <UniversityDetailClient universityId={resolved.id} />;
}

