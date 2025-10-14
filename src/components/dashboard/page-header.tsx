import { ShieldCheck } from 'lucide-react';
import { type ReactNode } from 'react';
import { LogoutButton } from '../auth/logout-button';

export function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-auto items-center justify-between gap-4 border-b bg-background/80 px-4 py-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-8 sm:pt-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          ClaimCheck Pro
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <LogoutButton />
      </div>
    </header>
  );
}
