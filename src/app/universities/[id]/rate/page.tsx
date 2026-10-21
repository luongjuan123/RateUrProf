import React from "react";
import RateSchoolClient from "./RateSchoolClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function RateUniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <RateSchoolClient universityId={resolvedParams.id} />;
}
