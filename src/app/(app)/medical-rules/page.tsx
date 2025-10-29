"use client";
import React, { useState } from 'react';
import { FileText, Upload, Download, CheckCircle } from 'lucide-react';
import pdfToText from 'react-pdftotext';
import { parseExtractedText } from '@/lib/medical-parser';
import { toast } from '@/hooks/use-toast';

const PDFTextExtractor = () => {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  

  const handleFileUpload = async (event:any) => {
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
      
      const parsedData = parseExtractedText(text);
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
      const response = await fetch('/api/rules/medical', {
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
          description: 'Medical rules saved successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save medical rules',
        variant: 'destructive',
      })
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">PDF Medical Rules Extractor</h1>
          </div>

          <div className="mb-8">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-indigo-500 mb-3" />
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF files only</p>
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Extracting text from PDF...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {extractedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold">Data extracted successfully!</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Save To DB
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">

                <div className="space-y-6">
                  {extractedData.encounterTypes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        A. Services by Encounter Type ({extractedData.encounterTypes.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {extractedData.encounterTypes.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                            <span className="font-mono text-sm text-indigo-600 font-semibold">{item.code}</span>
                            <span className="text-gray-700 text-sm ml-2">{item.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.facilityTypes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        B. Services by Facility Type ({extractedData.facilityTypes.length})
                      </h3>
                      <div className="space-y-3">
                        {extractedData.facilityTypes.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2">{item.facilityType}</div>
                            <div className="flex flex-wrap gap-2">
                              {item.allowedServices.map((srv: any, i: number) => (
                                <span key={i} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-mono">
                                  {srv}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.facilityRegistry.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Facility Registry ({extractedData.facilityRegistry.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {extractedData.facilityRegistry.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                            <div className="font-mono text-sm text-indigo-600 font-semibold">{item.id}</div>
                            <div className="text-gray-600 text-xs mt-1">{item.type}</div>
                          </div>
                        ))}
                      </div>
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

export default PDFTextExtractor;