'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ListChecks, RefreshCw } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function AuditLogSheet() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/audit');
      const result = await response.json();
      if (result.success) {
        setLogs(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch logs.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Fetching Logs',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const getBadgeVariant = (action: string) => {
    if (action.toLowerCase().includes('fail')) return 'destructive';
    if (action.toLowerCase().includes('start')) return 'secondary';
    return 'default';
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <ListChecks className="mr-2 h-4 w-4" />
          Audit Log
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Audit Log</SheetTitle>
          <SheetDescription>
            A real-time stream of events occurring in the validation engine.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
            <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
          <div className="space-y-4">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Badge variant={getBadgeVariant(log.action)}>{log.action}</Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-foreground">{log.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-10">
                No audit events recorded yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
