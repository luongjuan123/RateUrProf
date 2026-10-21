import { redirect } from "next/navigation";

export default async function RootAccountSubroutePage({
  params,
}: {
  params: Promise<{ subroute: string }>;
}) {
  const { subroute } = await params;
  redirect(`/vi/account/${subroute}`);
}
