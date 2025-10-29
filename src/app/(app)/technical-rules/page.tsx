"use client";
import React, { useState } from 'react';
import { FileText, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import pdfToText from 'react-pdftotext';
import { parseTechnicalRules } from '@/lib/technical-parser';
import { toast } from '@/hooks/use-toast';

const TechnicalRulesExtractor = () => {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

 

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await pdfToText(file);
      
      const parsedData = parseTechnicalRules(text);
      setExtractedData(parsedData);
      
    } catch (err: any) {
      setError('Error extracting text from PDF: ' + err.message);
      console.error('PDF extraction error:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSave = async() => {
    try {
      const response = await fetch('/api/rules/technical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedData),
      })
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Technical rules saved successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save technical rules',
        variant: 'destructive',
      })
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-800">Technical Rules Extractor</h1>
          </div>

          <div className="mb-8">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-purple-500 mb-3" />
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Technical Adjudication PDF</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Extracting technical rules from PDF...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {extractedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold">Technical rules extracted successfully!</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Save To DB
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
               

                <div className="space-y-6">
                  {/* Section 1: Services Requiring Approval */}
                  {extractedData.servicesRequiringApproval.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        1) Services Requiring Prior Approval ({extractedData.servicesRequiringApproval.length})
                      </h3>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Service Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Approval Required?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {extractedData.servicesRequiringApproval.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono text-purple-600">{item.serviceID}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                                <td className="px-4 py-3 text-center">
                                  {item.approvalRequired ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      YES
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      NO
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                      <p className="text-yellow-800 text-sm">No services requiring approval parsed. Check raw text format.</p>
                    </div>
                  )}

                  {/* Section 2: Diagnosis Codes Requiring Approval */}
                  {extractedData.diagnosisCodesRequiringApproval.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        2) Diagnosis Codes Requiring Approval ({extractedData.diagnosisCodesRequiringApproval.length})
                      </h3>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Diagnosis Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Diagnosis</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Approval Required?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {extractedData.diagnosisCodesRequiringApproval.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono text-purple-600">{item.code}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.diagnosis}</td>
                                <td className="px-4 py-3 text-center">
                                  {item.approvalRequired ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      YES
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      NO
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                      <p className="text-yellow-800 text-sm">No diagnosis codes requiring approval parsed. Check raw text format.</p>
                    </div>
                  )}

                  {/* Section 3: Paid Amount Threshold */}
                  {/* Section 3: Paid Amount Threshold */}
                  {extractedData.paidAmountThreshold.threshold ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        3) Paid Amount Threshold
                      </h3>
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-purple-100 rounded-lg px-6 py-4">
                            <div className="text-xs text-purple-600 font-semibold mb-1">THRESHOLD</div>
                            <span className="text-3xl font-bold text-purple-700">
                              AED {extractedData.paidAmountThreshold.threshold}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800 mb-1">Prior Approval Required</div>
                            <div className="text-xs text-gray-600">When paid amount exceeds threshold</div>
                          </div>
                        </div>
                        {extractedData.paidAmountThreshold.description && (
                          <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                            <p className="text-sm text-gray-700">{extractedData.paidAmountThreshold.description}</p>
                          </div>
                        )}
                        <div className="mt-4 text-xs text-gray-500">
                          <span className="font-semibold">Validation:</span> Check if paid_amount_aed {'>'} {extractedData.paidAmountThreshold.threshold}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                      <p className="text-yellow-800 text-sm">Paid amount threshold not found. Check raw text format.</p>
                    </div>
                  )}

                  {/* Section 4: ID & Unique ID Formatting */}
                  {(extractedData.idFormattingRules.idFormat || extractedData.idFormattingRules.requirements.length > 0) ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        4) ID & Unique ID Formatting
                      </h3>
                      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        {extractedData.idFormattingRules.idFormat && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <h4 className="font-semibold text-gray-800 mb-2">ID Format Requirement</h4>
                            <p className="text-sm text-gray-700">{extractedData.idFormattingRules.idFormat}</p>
                            <div className="mt-2 text-xs text-gray-600">
                              <span className="font-semibold">Validation:</span> Check if all IDs match pattern [A-Z0-9]+
                            </div>
                          </div>
                        )}
                        
                        {extractedData.idFormattingRules.uniqueIdStructure && (
                          <div className="bg-green-50 border-l-4 border-green-500 p-4">
                            <h4 className="font-semibold text-gray-800 mb-2">Unique ID Structure</h4>
                            <p className="text-sm font-mono text-gray-700 bg-white px-3 py-2 rounded border border-green-200">
                              {extractedData.idFormattingRules.uniqueIdStructure}
                            </p>
                            <div className="mt-3 space-y-1 text-xs text-gray-600">
                              <div><span className="font-semibold">Example:</span> <code className="bg-white px-2 py-1 rounded">AB12-34CD-9XYZ</code></div>
                              <div><span className="font-semibold">Pattern:</span> <code className="bg-white px-2 py-1 rounded">[A-Z0-9]{'{'}{4}{'}'}-[A-Z0-9]{'{'}{4}{'}'}-[A-Z0-9]{'{'}{4}{'}'}</code></div>
                            </div>
                          </div>
                        )}
                        
                        {extractedData.idFormattingRules.requirements.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Formatting Rules</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {extractedData.idFormattingRules.requirements.map((req: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="text-purple-500 mt-1 flex-shrink-0">•</span>
                                    <span>{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                      <p className="text-yellow-800 text-sm">ID formatting rules not found. Check raw text format.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalRulesExtractor;