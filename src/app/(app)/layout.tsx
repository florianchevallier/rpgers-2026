import { redirect } from "next/navigation";
import { MobileTabBar } from "@/components/layout/mobile-tabbar";
import { Navbar } from "@/components/layout/navbar";
import { RealtimeCenter } from "@/components/realtime/realtime-center";
import { getCurrentSession } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <>
      <Navbar pseudo={session.user.pseudo} />
      <RealtimeCenter />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:pb-10">
        {children}
      </main>
      <MobileTabBar />
    </>
  );
}
