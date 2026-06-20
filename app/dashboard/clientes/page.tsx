// app/dashboard/clientes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosCRM, salvarClienteCRM, excluirClienteCRM } from './actions';
import Link from 'next/link';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNasc, setDataNasc] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getDadosCRM();
    setClientes(res.listaClientes);
    setVendas(res.listaVendas);
    setIsAdmin(res.isAdmin);
    setCarregando(false);
  }

  const formataMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🚀 Máscaras automáticas para edição
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setTelefone(v.substring(0, 15));
  };

  const handleDataNascChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 2 && v.length <= 4) v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
    else if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
    setDataNasc(v.substring(0, 10));
  };

  const abrirModal = (cliente?: any) => {
    if (cliente) {
      setEditId(cliente.id);
      setNome(cliente.nome);
      setTelefone(cliente.telefone || '');
      setDataNasc(cliente.dataNascimento || '');
    } else {
      setEditId(null);
      setNome('');
      setTelefone('');
      setDataNasc('');
    }
    setModalAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    await salvarClienteCRM(editId, nome, telefone, dataNasc);
    setModalAberto(false);
    carregar();
  };

  const excluir = async (id: number) => {
    if(confirm('Tem a certeza que deseja excluir este cliente?')) {
      await excluirClienteCRM(id);
      carregar();
    }
  };

  const mesAtual = new Date().getMonth() + 1;

  // Processar Inteligência de Clientes
  const clientesProcessados = clientes.map(c => {
    const compras = vendas.filter(v => v.idCliente === c.id);
    const totalGasto = compras.reduce((acc, v) => acc + v.total, 0);
    
    let aniversariante = false;
    if (c.dataNascimento) {
      const partes = c.dataNascimento.split('/');
      if (partes.length >= 2 && parseInt(partes[1], 10) === mesAtual) aniversariante = true;
    }

    return { ...c, qtdCompras: compras.length, totalGasto, aniversariante };
  }).filter(c => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return c.nome.toLowerCase().includes(termo) || (c.telefone && c.telefone.includes(termo));
  }).sort((a, b) => b.totalGasto - a.totalGasto); // Ordena por quem gasta mais

  const aniversariantesMes = clientesProcessados.filter(c => c.aniversariante).length;
  const melhorCliente = clientesProcessados.length > 0 ? clientesProcessados[0] : null;

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando CRM...</div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-2xl text-[#6A283A] mb-4">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Nome Completo</label>
                <input required value={nome} onChange={e => setNome(e.target.value)} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">WhatsApp</label>
                <input value={telefone} onChange={handleTelefoneChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Nascimento</label>
                <input value={dataNasc} onChange={handleDataNascChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="DD/MM/AAAA" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-3 rounded-xl hover:bg-zinc-300 uppercase text-sm">Cancelar</button>
                <button type="submit" className="flex-[2] bg-[#6A283A] text-white font-black py-3 rounded-xl hover:bg-[#521e2d] uppercase text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#6A283A] flex items-center gap-2">👥 Gestão de Clientes (CRM)</h2>
          <p className="text-zinc-500 text-sm font-medium mt-1">Fidelize e acompanhe quem compra na sua loja.</p>
        </div>
        <button onClick={() => abrirModal()} className="bg-[#6A283A] text-white px-5 py-2.5 rounded-lg font-black uppercase text-sm shadow-md hover:bg-[#521e2d] transition-all">
          ➕ Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E0DDDD] border-l-4 border-l-indigo-600 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total na Base</h3>
          <p className="text-2xl font-black text-indigo-700 mt-2">{clientes.length} Clientes</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E0DDDD] border-l-4 border-l-amber-500 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Aniversariantes do Mês</h3>
          <p className="text-2xl font-black text-amber-600 mt-2">{aniversariantesMes} 🎂</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E0DDDD] border-l-4 border-l-green-600 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Melhor Cliente 🏆</h3>
          <p className="text-lg font-black text-green-700 mt-2 truncate">{melhorCliente ? melhorCliente.nome : 'Nenhum'}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">{melhorCliente ? formataMoeda(melhorCliente.totalGasto) : ''}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
        <div className="mb-4">
          <input 
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="🔍 Buscar cliente por nome ou celular..."
            className="w-full sm:w-96 p-3 border border-[#E0DDDD] rounded-xl focus:ring-2 focus:ring-[#6A283A] outline-none font-bold text-sm bg-zinc-50"
          />
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-[#E0DDDD]">
              <tr>
                <th className="p-3 text-xs font-bold text-zinc-600">Cliente</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Contato / Nasc.</th>
                <th className="p-3 text-xs font-bold text-zinc-600 text-center">Compras</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Total Gasto</th>
                <th className="p-3 text-xs font-bold text-zinc-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesProcessados.map(c => (
                <tr key={c.id} className={`border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 ${c.aniversariante ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-3">
                    <p className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                      {c.nome} {c.aniversariante && <span title="Faz anos este mês!" className="animate-bounce">🎂</span>}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-xs font-bold text-zinc-600">{c.telefone || 'Sem contato'}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">{c.dataNascimento || 'Nasc. não informado'}</p>
                  </td>
                  <td className="p-3 text-center font-bold text-zinc-600 text-sm">{c.qtdCompras}</td>
                  <td className="p-3 font-black text-green-700 text-sm">{formataMoeda(c.totalGasto)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {c.telefone && (
                        <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=Olá ${c.nome}! Temos novidades para si no Mundo dos Perfumes!`} target="_blank" className="bg-[#25D366] text-white text-[10px] font-black px-2 py-1 rounded hover:bg-[#128C7E] transition-colors" title="Enviar WhatsApp">💬 Promoção</a>
                      )}
                      <button onClick={() => abrirModal(c)} className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded hover:bg-amber-200 transition-colors">✏️ Editar</button>
                      {isAdmin && (
                        <button onClick={() => excluir(c.id)} className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded hover:bg-red-200 transition-colors">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {clientesProcessados.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-zinc-500">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}