import { redirect } from "next/navigation";

/** The workspace lives at /dashboard; this keeps the bare domain useful. */
export default function HomePage() {
  redirect("/dashboard");
}
