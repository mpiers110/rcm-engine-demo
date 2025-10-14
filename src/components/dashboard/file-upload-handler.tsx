'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileUp, BookCheck, Wrench, Loader2, BrainCircuit, FileJson, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FileUploadHandlerProps {
  onValidationStart: (mode: 'rules' | 'llm') => void;
  isLoading: boolean;
  onFilesUploaded: () => void;
}

const UploadCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  isProcessing: boolean;
  isLoaded: boolean;
  loadedFileName: string | null;
}> = ({ icon: Icon, title, description, onFileChange, accept, isProcessing, isLoaded, loadedFileName }) => (
  <Card className="flex-1">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        {isLoaded && !isProcessing && <CheckCircle className="h-6 w-6 text-green-500" />}
        {isProcessing && <Loader2 className="h-6 w-6 animate-spin" />}
      </div>
    </CardHeader>
    <CardContent className="grid gap-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor={`${title}-file`}>
          {isLoaded && loadedFileName ? `Loaded: ${loadedFileName}` : 'Upload File'}
        </Label>
        <Input 
          id={`${title}-file`} 
          type="file" 
          onChange={onFileChange} 
          accept={accept} 
          disabled={isProcessing}
        />
      </div>
    </CardContent>
  </Card>
);

export function FileUploadHandler({
  onValidationStart,
  isLoading,
  onFilesUploaded,
}: FileUploadHandlerProps) {
  const [isParsing, startTransition] = useTransition();
  const { toast } = useToast();

  const [claimsFile, setClaimsFile] = useState<File | null>(null);
  const [medicalRulesFile, setMedicalRulesFile] = useState<File | null>(null);
  const [technicalRulesFile, setTechnicalRulesFile] = useState<File | null>(null);

  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [medicalRulesLoaded, setMedicalRulesLoaded] = useState(false);
  const [technicalRulesLoaded, setTechnicalRulesLoaded] = useState(false);
  
  const canValidate = claimsLoaded && medicalRulesLoaded && technicalRulesLoaded;
  const currentLoading = isLoading || isParsing;

  const handleFileUpload = async (
    file: File,
    type: 'claims' | 'medical-rules' | 'technical-rules'
  ) => {
    startTransition(async () => {
      let endpoint = '';
      let setState: (loaded: boolean) => void;
      let setFile: (file: File | null) => void;

      if (type === 'claims') {
        if (!file.type.includes('excel') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            toast({ variant: 'destructive', title: 'Upload Error', description: 'Invalid file type for claims. Please upload an Excel file (.xlsx, .xls).' });
            return;
        }
        endpoint = '/api/ingest';
        setState = setClaimsLoaded;
        setFile = setClaimsFile;
      } else {
        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: 'Upload Error', description: 'Invalid file type for rules. Please upload a PDF file.'});
            return;
        }
        endpoint = type === 'medical-rules' ? '/api/rules/medical' : '/api/rules/technical';
        setState = type === 'medical-rules' ? setMedicalRulesLoaded : setTechnicalRulesLoaded;
        setFile = type === 'medical-rules' ? setMedicalRulesFile : setTechnicalRulesFile;
      }

      setState(false); // Reset on new upload
      setFile(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `Failed to save ${type}.`);
        }
        
        setState(true);
        setFile(file);
        onFilesUploaded();
        toast({
          title: 'File Saved',
          description: `Successfully processed and saved ${file.name}.`,
        });

      } catch (error: any) {
        console.error('File upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Error',
          description: error.message,
        });
        setState(false);
        setFile(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Rules Setup</CardTitle>
        <CardDescription>Load your claims and adjudication rule documents into the database to begin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <UploadCard
            icon={FileUp}
            title="Claims Data"
            description="Upload claims in Excel (.xlsx, .xls) format."
            onFileChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'claims')}
            accept=".xlsx, .xls"
            isProcessing={isParsing && !claimsLoaded}
            isLoaded={claimsLoaded}
            loadedFileName={claimsFile?.name || null}
          />
          <UploadCard
            icon={BookCheck}
            title="Medical Rules"
            description="Upload medical rules as a PDF file."
            onFileChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'medical-rules')}
            accept=".pdf"
            isProcessing={isParsing && !medicalRulesLoaded}
            isLoaded={medicalRulesLoaded}
            loadedFileName={medicalRulesFile?.name || null}
          />
          <UploadCard
            icon={Wrench}
            title="Technical Rules"
            description="Upload technical rules as a PDF file."
            onFileChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'technical-rules')}
            accept=".pdf"
            isProcessing={isParsing && !technicalRulesLoaded}
            isLoaded={technicalRulesLoaded}
            loadedFileName={technicalRulesFile?.name || null}
          />
        </div>
        <div className="flex flex-col md:flex-row justify-end items-center gap-4 rounded-lg border p-4">
          <Button
            onClick={() => onValidationStart('rules')}
            disabled={!canValidate || currentLoading}
            size="lg"
            variant="secondary"
          >
            {currentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileJson className="mr-2 h-4 w-4" />
            Validate with Rules
          </Button>
          <Button
            onClick={() => onValidationStart('llm')}
            disabled={!canValidate || currentLoading}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {currentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <BrainCircuit className="mr-2 h-4 w-4" />
            Validate with LLM
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
