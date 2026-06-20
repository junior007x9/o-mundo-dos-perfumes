// app/dashboard/caixas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosHistoricoCaixas } from './actions';

export default function CaixasPage() {
  const [listaCaixas, setListaCaixas] = useState<any[]>([]);
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const res = await getDadosHistoricoCaixas();
      setListaCaixas(res.listaCaixas);
      setListaVendas(res.listaVendas);
      setCarregando(false);
    }
    carregar();
  }, []);

  const formataMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando auditoria de caixas...</div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-[#6A283A] flex items-center gap-2">🔐 Auditoria de Caixas</h2>
        <p className="text-zinc-500 text-sm font-medium mt-1">Histórico completo de aberturas e fechamentos de turnos.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
        <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-[#E0DDDD]">
              <tr>
                <th className="p-3 text-xs font-bold text-zinc-600">ID / Status</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Abertura</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Fechamento</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Troco Inicial</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Vendido no Turno</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Total Informado no Fecho</th>
              </tr>
            </thead>
            <tbody>
              {listaCaixas.map(c => {
                const vendasDoTurno = listaVendas.filter(v => v.idCaixa === c.id && v.status === 'concluida');
                const totalVendido = vendasDoTurno.reduce((acc, v) => acc + v.total, 0);
                const valorEsperado = (c.saldoInicial || 0) + totalVendido;
                const quebra = c.saldoFinal ? c.saldoFinal - valorEsperado : 0;

                return (
                  <tr key={c.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800">#{c.id}</span>
                        {c.status === 'aberto' ? (
                          <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded font-black uppercase">Aberto</span>
                        ) : (
                          <span className="bg-zinc-200 text-zinc-600 text-[9px] px-2 py-0.5 rounded font-black uppercase">Fechado</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-xs font-medium text-zinc-600">{new Date(c.dataAbertura).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-xs font-medium text-zinc-600">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleString('pt-BR') : 'Em andamento...'}</td>
                    <td className="p-3 text-sm font-bold text-zinc-700">{formataMoeda(c.saldoInicial || 0)}</td>
                    <td className="p-3 text-sm font-black text-green-600">{formataMoeda(totalVendido)}</td>
                    <td className="p-3">
                      {c.status === 'fechado' ? (
                        <div>
                          <p className="text-sm font-black text-zinc-800">{formataMoeda(c.saldoFinal || 0)}</p>
                          {quebra !== 0 && (
                            <p className={`text-[10px] font-bold mt-0.5 ${quebra < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                              {quebra < 0 ? `Falta ${formataMoeda(Math.abs(quebra))}` : `Sobrou ${formataMoeda(quebra)}`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Aguardando fecho...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {listaCaixas.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">Nenhum caixa registado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}