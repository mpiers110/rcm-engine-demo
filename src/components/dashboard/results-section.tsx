import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, FileSearch } from 'lucide-react';

import type { Claim } from '@/lib/types';
import { ChartsView } from './charts-view';
import { ClaimsTable } from './data-table/claims-table';

interface ResultsSectionProps {
  claims: Claim[] | null;
  isLoading: boolean;
}

export function ResultsSection({ claims, isLoading }: ResultsSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!claims) {
    return (
      <Card className="flex flex-col items-center justify-center py-20">
        <FileSearch className="h-16 w-16 text-muted-foreground" />
        <CardTitle className="mt-4">No Results to Display</CardTitle>
        <CardDescription className="mt-2 text-center">
          Load your data and run the validation to see the results here.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation Results</CardTitle>
        <CardDescription>
          An overview of the adjudicated claims, with detailed error analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="overview">
              <BarChart className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileSearch className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <ChartsView claims={claims} />
          </TabsContent>
          <TabsContent value="details">
            <ClaimsTable claims={claims} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
