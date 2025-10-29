"use client";
import Navbar from '@/components/navbar';
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoadingSession = status === "loading";
  const currentUser = session?.user;

  useEffect(() => {
    if (!isLoadingSession && !currentUser && pathname !== '/') {
      router.push('/');
    }
  }, [currentUser, isLoadingSession, pathname]);

  return (
        <Navbar>
          {children}
        </Navbar>
  );
}