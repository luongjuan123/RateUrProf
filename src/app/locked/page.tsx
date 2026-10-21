import { redirect } from "next/navigation";

export default function LockedFallbackPage() {
  redirect("/vi/locked");
}
