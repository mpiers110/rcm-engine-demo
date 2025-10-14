
'use client'; 

import React, { useEffect } from 'react'; 
import { useRouter } from 'next/navigation'; 
import {Loader2} from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoadingSession = status === "loading";

  useEffect(() => {
    if (status === "authenticated") {
      router.push('/');
    }
  }, [status, router]);

  if (isLoadingSession || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-primary-foreground">
            <Image src="/logo.png" alt="Logo" width="52" height="60" className="rounded-full" loading="lazy" />
          </div>
          <CardTitle className="text-3xl font-bold">ClaimCheck Pro</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
