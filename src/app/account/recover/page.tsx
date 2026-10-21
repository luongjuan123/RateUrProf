"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RecoverRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/vi/account/recover${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function AccountRecoverFallback() {
  return (
    <Suspense fallback={null}>
      <RecoverRedirect />
    </Suspense>
  );
}
