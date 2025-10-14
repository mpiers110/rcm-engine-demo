'use client';

import { useState, useTransition, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import type { Claim } from '@/lib/types';
import { PageHeader } from './page-header';
import { ResultsSection } from './results-section';
import { AuditLogSheet } from './audit-log-sheet';
import { Skeleton } from '@/components/ui/skeleton';

const FileUploadHandler = dynamic(
  () => import('./file-upload-handler').then((mod) => mod.FileUploadHandler),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full" /> 
  }
);


export function DashboardClient() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [processedClaims, setProcessedClaims] = useState<Claim[] | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/claims');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setProcessedClaims(result.data);
    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Could not load results',
          description: error.message,
        });
    }
  }, [toast]);


  const handleValidate = (mode: 'rules' | 'llm') => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Validation request failed.');
        }

        setProcessedClaims(result.data);
        toast({
          title: 'Validation Complete',
          description: `Processed ${result.data.length} claims using ${mode.toUpperCase()} engine.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Validation Failed',
          description: error.message,
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader>
        <AuditLogSheet />
      </PageHeader>
      <main className="flex-1 space-y-4 p-4 md:space-y-8 md:p-8">
        <FileUploadHandler
            onValidationStart={handleValidate}
            isLoading={isPending}
            onFilesUploaded={fetchResults}
        />
        <ResultsSection claims={processedClaims} isLoading={isPending} />
      </main>
    </div>
  );
}
