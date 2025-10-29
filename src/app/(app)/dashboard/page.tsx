'use client';

import { FileText, Settings, CheckSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-xl p-8 text-white mb-8">
        <h2 className="text-2xl font-bold mb-4">How to Use This System</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Upload or Parse Medical Rules</h3>
              <p className="text-indigo-100">
                Go to the Medical Rules page to upload and parse your medical adjudication PDF. This extracts encounter types, facility restrictions, diagnosis requirements, and mutually exclusive diagnoses.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Upload or Parse Technical Rules</h3>
              <p className="text-indigo-100">
                Navigate to Technical Rules to upload your technical adjudication PDF. This extracts prior approval requirements, paid amount thresholds, and ID formatting rules.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Validate Claims Data</h3>
              <p className="text-indigo-100">
                Go to Validate Claims page. Choose to use existing parsed rules or upload new ones. Then upload your claims Excel file to run validation and view results, charts, and download reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/medical-rules">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
            <FileText className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Medical Rules</h3>
            <p className="text-gray-600 mb-4">
              Parse and extract medical adjudication rules from PDF documents.
            </p>
            <div className="flex items-center text-indigo-600 font-semibold">
              Go to Medical Rules <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </Link>

        <Link href="/technical-rules">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
            <Settings className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Technical Rules</h3>
            <p className="text-gray-600 mb-4">
              Extract technical validation rules including approval requirements and thresholds.
            </p>
            <div className="flex items-center text-purple-600 font-semibold">
              Go to Technical Rules <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </Link>

        <Link href="/validate-claims">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
            <CheckSquare className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Validate Claims</h3>
            <p className="text-gray-600 mb-4">
              Run validation engine on claims data using parsed medical and technical rules.
            </p>
            <div className="flex items-center text-green-600 font-semibold">
              Go to Validation <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}