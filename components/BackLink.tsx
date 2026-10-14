import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
      <ArrowLeft size={14} /> Back
    </Link>
  );
}
