"use client";
import { useState, useTransition, useEffect } from 'react';
import { XCircle, FileText, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit, FileJson, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { Result } from '@/lib/extract';
import { useSession } from 'next-auth/react';

const ClaimsValidationEngine = () => {
  const {data: session} = useSession();
  const currentUser = session?.user;
  const [isParsing, startTransition] = useTransition();
  const [medicalRules, setMedicalRules] = useState<any>(null);
  const [technicalRules, setTechnicalRules] = useState<any>(null);
  const [claimsData, setClaimsData] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<{
    aiRecommendation?: {
        errorExplanation: string;
        recommendedAction: string;
    };
    results: Result[];
    summary: any;
    chartData: {
        countData: {
            name: string;
            value: number;
        }[];
        amountData: {
            name: string;
            value: number;
        }[];
        categoryData: {
            name: string;
            count: any;
            amount: number;
        }[];
    };
} | null>(null);
  const [loading, setLoading] = useState(false);

  const parseExcel = (file: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const fetchMedicalRules = async () => {
      try {
    const file = await fetch(`/api/rules/medical?ownerId=${currentUser?.id}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await file.json();
    if (data) {
        setMedicalRules(data.rules);
    }
      } catch (error) {
        console.error('Error parsing medical rules:', error);
      }
  };

  const fetchTechnicalRules = async () => {
      try {
    const file = await fetch(`/api/rules/technical?ownerId=${currentUser?.id}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await file.json();
    if (data) {
        setTechnicalRules(data.rules);
    }
      } catch (error) {
        console.error('Error parsing technical rules:', error);
      }
  };

  const handleClaimsUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const data = await parseExcel(file);
        const saveToDb = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claims: data }),
        });
        const saveToDbData = await saveToDb.json();
        if (!saveToDbData.success) {
          throw new Error(saveToDbData.error);
        }
        toast({
          title: 'Claims Ingested',
          description: 'Claims ingested successfully',
        })
        setClaimsData(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error Parsing Claims',
          description: 'Failed to parse claims',
        })
        console.error('Error parsing claims:', error);
      }
    }
  };

  const handleValidate = (mode: 'rules' | 'llm') => {
    startTransition(async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Validation request failed.');
        }

        
        setValidationResults(result.data);
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
      } finally {
        setLoading(false);
      }
    });
  };

  const COLORS = {
    'No Error': '#10b981',
    'Medical Error': '#f59e0b',
    'Technical Error': '#ef4444',
    'Both': '#dc2626'
  };

  useEffect(() => {
    fetchTechnicalRules();
    fetchMedicalRules();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Claims Validation Engine</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Medical Rules
              </label>
              {medicalRules ? <p className="text-xs text-green-600 mt-1">✓ Loaded</p> : <Loader2 />}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Technical Rules
              </label>
              {technicalRules ? <p className="text-xs text-green-600 mt-1">✓ Loaded</p> : <Loader2 />}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Claims Data (Excel)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleClaimsUpload}
                disabled={isParsing || loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {claimsData && <p className="text-xs text-green-600 mt-1">✓ Loaded ({claimsData.length} claims)</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end items-center gap-4 rounded-lg border p-4">
          <Button
            onClick={() => handleValidate('rules')}
            disabled={(!claimsData || !medicalRules || !technicalRules) || loading}
            
            size="lg"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileJson className="mr-2 h-4 w-4" />
            Validate with Rules
          </Button>
          <Button
            onClick={() => handleValidate('llm')}
            disabled={(!claimsData || !medicalRules || !technicalRules) || loading}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <BrainCircuit className="mr-2 h-4 w-4" />
            Validate with LLM
          </Button>
        </div>
        </div>
        
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Validating claims...</p>
            </div>
          )}

        {validationResults && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {validationResults.chartData.countData && (<div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Claim Counts by Error Category
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={validationResults.chartData.countData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Count">
                      {validationResults.chartData.countData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>)}

              {validationResults.chartData.amountData && (<div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Paid Amount by Error Category (AED)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={validationResults.chartData.amountData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Amount (AED)">
                      {validationResults.chartData.amountData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>)}
            </div>

            <Tabs defaultValue="rule">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="rule">
              <BarChart className="mr-2 h-4 w-4" />
              Rule-Based
            </TabsTrigger>
            <TabsTrigger value="llm">
              <BrainCircuit className="mr-2 h-4 w-4" />
              LLM-Based
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rule">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Validation Results</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Unique ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Error Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Explanation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResults.results.map((result, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{result.uniqueId}</td>
                        <td className="px-4 py-3 text-sm">
                          {result.status === 'Validated' ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Validated
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              Not Validated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            result.errorType === 'No Error' ? 'bg-green-100 text-green-800' :
                            result.errorType === 'Medical Error' ? 'bg-yellow-100 text-yellow-800' :
                            result.errorType === 'Technical Error' ? 'bg-red-100 text-red-800' :
                            'bg-red-200 text-red-900'
                          }`}>
                            {result.errorType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line max-w-md">
                          {result.explanation}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                          {result.recommendedAction}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="llm">
            
                        {validationResults.aiRecommendation && (<div>
                        <p className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line max-w-md">
                          {validationResults.aiRecommendation.errorExplanation}
                        </p>
                        <p className="px-4 py-3 text-sm text-gray-700 max-w-md">
                          {validationResults.aiRecommendation.recommendedAction}
                        </p>
                        </div>)}
          </TabsContent>
        </Tabs>


          </>
        )}
      </div>
    </div>
  );
};

export default ClaimsValidationEngine;