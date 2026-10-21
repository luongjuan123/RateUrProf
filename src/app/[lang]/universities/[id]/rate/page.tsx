import React from "react";
import RateSchoolClient from "@/app/universities/[id]/rate/RateSchoolClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function LocalizedRateUniversityPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const resolved = await params;
  return <RateSchoolClient universityId={resolved.id} />;
}
