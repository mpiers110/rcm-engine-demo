'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { Claim, ClaimStatus, ErrorType } from '@/lib/types';
import { Info } from 'lucide-react';

const statusVariant: Record<ClaimStatus, 'default' | 'destructive'> = {
  Validated: 'default',
  'Not validated': 'destructive',
};

const errorTypeVariant: Record<
  ErrorType,
  'default' | 'destructive' | 'secondary'
> = {
  'No error': 'default',
  'Medical error': 'destructive',
  'Technical error': 'destructive',
  both: 'destructive',
};

const errorTypeClass: Record<
  ErrorType,
  string
> = {
  'No error': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Medical error': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Technical error': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const TextWithTooltip = ({ text, tooltipText }: { text: string, tooltipText: string | React.ReactNode }) => {
    if (!tooltipText) return <>{text}</>;
    
    const displayText = text.length > 50 ? `${text.substring(0, 50)}...` : text;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                        {displayText}
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-md bg-background text-foreground border-border shadow-lg p-4">
                  <div className="prose prose-sm dark:prose-invert">
                    {typeof tooltipText === 'string' ? <p>{tooltipText}</p> : tooltipText}
                  </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export const columns: ColumnDef<Claim>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'claim_id',
    header: 'Claim ID',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as ClaimStatus;
      return <Badge variant={statusVariant[status]}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'error_type',
    header: 'Error Type',
    cell: ({ row }) => {
      const errorType = row.getValue('error_type') as ErrorType;
      return <Badge className={errorTypeClass[errorType]}>{errorType}</Badge>;
    },
  },
  {
    accessorKey: 'error_explanation',
    header: 'Explanation',
    cell: ({ row }) => {
      const explanation = row.getValue('error_explanation') as string;
      const rawErrors = (row.original.raw_errors ?? []).map((e, i) => <li key={i}>{e}</li>);

      const tooltipContent = (
        <div>
          <h4 className="font-semibold mb-2">Error Explanation:</h4>
          <p className="mb-4">{explanation || "No AI explanation available."}</p>
          {rawErrors.length > 0 && (
            <>
              <h4 className="font-semibold mb-2 border-t pt-2 mt-2">Detected Rule Violations:</h4>
              <ul className="list-disc pl-5 space-y-1">{rawErrors}</ul>
            </>
          )}
        </div>
      );

      return <TextWithTooltip text={explanation} tooltipText={tooltipContent} />;
    },
  },
    {
    accessorKey: 'recommended_action',
    header: 'Recommended Action',
    cell: ({ row }) => {
      const action = row.getValue('recommended_action') as string;
      return <TextWithTooltip text={action} tooltipText={action} />;
    },
  },
  {
    accessorKey: 'paid_amount_aed',
    header: () => <div className="text-right">Paid Amount (AED)</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('paid_amount_aed'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'AED',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'service_code',
    header: 'Service Code',
  },
  {
    accessorKey: 'diagnosis_codes',
    header: 'Diagnosis Codes',
  },
  {
    accessorKey: 'encounter_type',
    header: 'Encounter',
  },
  {
    accessorKey: 'service_date',
    header: 'Service Date',
  },
  {
    accessorKey: 'facility_id',
    header: 'Facility ID',
  },
  {
    accessorKey: 'member_id',
    header: 'Member ID',
  },
  {
    accessorKey: 'national_id',
    header: 'National ID',
  },
  {
    accessorKey: 'unique_id',
    header: 'Unique ID',
  },
  {
    accessorKey: 'approval_number',
    header: 'Approval No.',
  },
];
