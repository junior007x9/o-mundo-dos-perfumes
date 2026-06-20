'use client';

import Link from 'next/link';

export default function BotaoEditar({ produtoId }: { produtoId: number }) {
  return (
    <Link 
      href={`/dashboard/produtos?editId=${produtoId}`} 
      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 flex items-center justify-center active:scale-95" 
      title="Editar Produto"
    >
      ✏️
    </Link>
  );
}