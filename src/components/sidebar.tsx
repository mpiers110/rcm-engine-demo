"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Settings, CheckSquare, Home, X } from 'lucide-react';

export default function Sidebar({isOpen, setOpen}: {isOpen: boolean, setOpen: (open: boolean) => void}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Medical Rules', href: '/medical-rules', icon: FileText },
    { name: 'Technical Rules', href: '/technical-rules', icon: Settings },
    { name: 'Validate Claims', href: '/validate-claims', icon: CheckSquare },
  ];

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 bg-indigo-800">
          <h1 className="text-xl font-bold text-white">Claims Validator</h1>
          <button
            onClick={() => setOpen(false)}
            className="text-white lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-indigo-800">
          <div className="text-indigo-300 text-sm">
            <p className="font-semibold">Humaein Health</p>
            <p className="text-xs mt-1">Claims Validation System v1.0</p>
          </div>
        </div>
      </div></>
  );
}