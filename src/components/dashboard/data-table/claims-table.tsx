import { ScrollArea } from '@/components/ui/scroll-area';
import type { Claim } from '@/lib/types';
import { columns } from './columns';
import { DataTable } from './data-table';

interface ClaimsTableProps {
  claims: Claim[];
}

export function ClaimsTable({ claims }: ClaimsTableProps) {
  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <DataTable columns={columns} data={claims} />
      </ScrollArea>
    </div>
  );
}
