import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { MobileTabBar } from "@/components/layout/mobile-tabbar";
import { Navbar } from "@/components/layout/navbar";
import { OfflineRuntime } from "@/components/offline/offline-runtime";
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
      <Navbar
        pseudo={session.user.pseudo}
        version={process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
      />
      <OfflineRuntime />
      <RealtimeCenter />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-12 sm:pt-8">
        <ViewTransition
          enter={{
            "nav-forward": "nav-forward",
            "nav-tab": "nav-tab",
            default: "none",
          }}
          exit={{
            "nav-forward": "nav-forward",
            "nav-tab": "nav-tab",
            default: "none",
          }}
          default="none"
        >
          {children}
        </ViewTransition>
      </main>
      <MobileTabBar />
    </>
  );
}
