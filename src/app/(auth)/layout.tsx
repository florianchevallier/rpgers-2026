import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
