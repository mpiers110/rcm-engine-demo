'use client';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const { data: session } = useSession();

  // Only render the button if the user is authenticated.
  if (!session) {
    return null;
  }

  return (
    <Button variant="ghost" onClick={() => signOut()}>
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
