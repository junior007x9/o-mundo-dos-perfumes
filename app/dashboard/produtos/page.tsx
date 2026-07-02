// app/dashboard/produtos/page.tsx
import { db } from '@/db';
import { produtos, logsSistema, itensVenda } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import BotaoCamera from './BotaoCamera';
import BotaoExcluir from './BotaoExcluir';
import BotaoEditar from './BotaoEditar';
import InputMoeda from './InputMoeda'; 
import InputPesquisa from './InputPesquisa'; 
import Link from 'next/link';
import { getUsuarioLogado } from '@/app/actions'; 

const parseDinheiro = (valor: string | FormDataEntryValue | null) => {
  if (!valor) return 0;
  const formatado = valor.toString().replace(/\./g, '').replace(',', '.');
  const numero = Number(formatado);
  return isNaN(numero) ? 0 : numero;
};

export default async function ProdutosPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ editId?: string, q?: string, estoque?: string, msg?: string, erro?: string }> 
}) {
  const params = await searchParams;
  const editId = params?.editId;
  const q = params?.q || ''; 
  const filtroEstoque = params?.estoque || 'todos'; 
  const msgSucesso = params?.msg; 
  const msgErro = params?.erro; 

  const usuLogado = await getUsuarioLogado();
  const isAdmin = usuLogado?.cargo === 'admin';

  const listaProdutosCompleta = await db.select().from(produtos).orderBy(desc(produtos.id));

  const listaProdutos = listaProdutosCompleta.filter((p) => {
    let textoBate = true;
    if (q) {
      const termo = q.toLowerCase();
      textoBate = p.nome.toLowerCase().includes(termo) ||
                  (p.codigoBarras?.toLowerCase().includes(termo) ?? false) ||
                  (p.descricao?.toLowerCase().includes(termo) ?? false);
    }

    let estoqueBate = true;
    if (filtroEstoque === 'com_estoque') {
      estoqueBate = p.estoque > 0;
    } else if (filtroEstoque === 'sem_estoque') {
      estoqueBate = p.estoque <= 0;
    }

    return textoBate && estoqueBate;
  });

  let produtoEditando = null;
  if (editId) {
    const res = await db.select().from(produtos).where(eq(produtos.id, Number(editId))).limit(1);
    produtoEditando = res[0] || null;
  }

  async function salvarProduto(formData: FormData) {
    'use server';
    const usu = await getUsuarioLogado();
    const nomeUsuario = usu?.nome || 'Sistema';

    const id = formData.get('id') as string;
    const codigoForm = formData.get('codigoBarras') as string;
    const codigoFinal = codigoForm?.trim() !== '' ? codigoForm.trim() : null;

    if (codigoFinal) {
      const existente = await db.select().from(produtos).where(eq(produtos.codigoBarras, codigoFinal)).limit(1);
      if (existente.length > 0 && existente[0].id.toString() !== id) {
        redirect(`/dashboard/produtos?erro=ALERTA: O código de barras ${codigoFinal} já está a ser usado no produto "${existente[0].nome}"!`);
      }
    }

    const dados = {
      codigoBarras: codigoFinal,
      nome: formData.get('nome') as string,
      descricao: formData.get('descricao') as string,
      precoCusto: parseDinheiro(formData.get('precoCusto')),
      precoVenda: parseDinheiro(formData.get('precoVenda')),
      estoque: Number(formData.get('estoque')),
    };

    if (id) {
      // Pega o estoque antigo para informar na Auditoria
      const prodAntigo = await db.select().from(produtos).where(eq(produtos.id, Number(id))).limit(1);
      const estoqueAntigo = prodAntigo[0]?.estoque || 0;

      await db.update(produtos).set(dados).where(eq(produtos.id, Number(id)));

      let msgLog = `✏️ Produto editado: "${dados.nome}".`;
      if (estoqueAntigo !== dados.estoque) {
        msgLog += ` Estoque ajustado: [Tinha ${estoqueAntigo} ➡️ Agora ${dados.estoque}]`;
      }

      await db.insert(logsSistema).values({
        descricao: msgLog,
        data: new Date().toISOString(),
        categoria: 'produto',
        usuarioNome: nomeUsuario
      });
    } else {
      await db.insert(produtos).values(dados);
      await db.insert(logsSistema).values({
        descricao: `➕ Novo produto cadastrado: "${dados.nome}". [Estoque Inicial: ${dados.estoque}]`,
        data: new Date().toISOString(),
        categoria: 'produto',
        usuarioNome: nomeUsuario
      });
    }
    
    redirect('/dashboard/produtos?msg=Produto guardado com sucesso no estoque!');
  }

  // 🚀 LÓGICA DE EXCLUSÃO DE KITS CORRIGIDA E DETALHADA PARA A AUDITORIA
  async function excluirProduto(formData: FormData) {
    'use server';
    const usu = await getUsuarioLogado();
    const nomeUsuario = usu?.nome || 'Sistema';

    if (usu?.cargo !== 'admin') {
      throw new Error("Apenas administradores podem excluir produtos do sistema.");
    }

    const idParaExcluir = Number(formData.get('idExcluir'));
    const resProd = await db.select().from(produtos).where(eq(produtos.id, idParaExcluir)).limit(1);
    
    if (resProd.length > 0) {
      const produtoApagado = resProd[0];

      if (produtoApagado.nome.startsWith('🎁 Kit:')) {
        const descKit = produtoApagado.descricao || '';
        const prefixoDesc = 'Contém: ';
        
        if (descKit.startsWith(prefixoDesc)) {
          const itensString = descKit.substring(prefixoDesc.length);
          // 🚀 Agora reconhece o novo separador ' | ' que é muito mais seguro que a vírgula
          const separador = itensString.includes(' | ') ? ' | ' : ', ';
          const nomesDosItens = itensString.split(separador).map(n => n.trim());
          
          const listaAtual = await db.select().from(produtos);
          let logsDetalhesKit: string[] = [];
          
          for (const nomeItem of nomesDosItens) {
            const prodAlvo = listaAtual.find(p => p.nome === nomeItem);
            if (prodAlvo) {
              const estoqueAntigo = prodAlvo.estoque;
              const quantidadeDevolvida = produtoApagado.estoque;
              const novoEstoque = estoqueAntigo + quantidadeDevolvida;

              await db.update(produtos)
                .set({ estoque: novoEstoque })
                .where(eq(produtos.id, prodAlvo.id));
              
              // 🚀 Registra a matemática explícita para o cliente ver!
              logsDetalhesKit.push(`[${prodAlvo.nome}: Tinha ${estoqueAntigo} ➡️ Voltou +${quantidadeDevolvida} ➡️ Agora ${novoEstoque}]`);
            }
          }
          
          await db.insert(logsSistema).values({
            descricao: `♻️ Kit Desmanchado: "${produtoApagado.nome}". Estoque restaurado: ${logsDetalhesKit.join(' | ')}`,
            data: new Date().toISOString(),
            categoria: 'produto',
            usuarioNome: nomeUsuario
          });
        }
      } else {
        await db.insert(logsSistema).values({
          descricao: `🗑️ Produto excluído permanentemente: "${produtoApagado.nome}" (Tinha ${produtoApagado.estoque} un. no estoque).`,
          data: new Date().toISOString(),
          categoria: 'produto',
          usuarioNome: nomeUsuario
        });
      }

      await db.delete(itensVenda).where(eq(itensVenda.idProduto, idParaExcluir));
      await db.delete(produtos).where(eq(produtos.id, idParaExcluir));
    }

    redirect('/dashboard/produtos?msg=Item apagado e estoque reorganizado com sucesso!');
  }

  // 🚀 LÓGICA DE MONTAGEM DE KITS COM MATEMÁTICA EXPLÍCITA
  async function montarKit(formData: FormData) {
    'use server';
    const usu = await getUsuarioLogado();
    const nomeUsuario = usu?.nome || 'Sistema';

    const nomeKit = formData.get('nomeKit') as string;
    const precoVendaKit = parseDinheiro(formData.get('precoVendaKit'));
    const qtdKits = Number(formData.get('qtdKits') || 1);
    
    const produtosSelecionados = formData.getAll('produtosKit') as string[];

    if (produtosSelecionados.length === 0) {
      redirect(`/dashboard/produtos?erro=ALERTA: Tem que selecionar pelo menos um produto para montar o Kit!`);
    }

    const itens = await db.select().from(produtos).where(inArray(produtos.id, produtosSelecionados.map(Number)));

    const itensSemEstoque = itens.filter(item => item.estoque < qtdKits);
    if (itensSemEstoque.length > 0) {
      const nomesErrados = itensSemEstoque.map(i => i.nome).join(', ');
      redirect(`/dashboard/produtos?erro=ESTOQUE INSUFICIENTE: Não tem quantidade suficiente de [ ${nomesErrados} ] para montar este(s) kit(s)!`);
    }

    let custoTotal = 0;
    const nomesItens = [];
    let logsDetalhesMontagem: string[] = [];

    for (const item of itens) {
      custoTotal += Number(item.precoCusto) * qtdKits;
      nomesItens.push(item.nome);
      
      const estoqueAntigo = item.estoque;
      const novoEstoque = item.estoque - qtdKits;

      await db.update(produtos)
        .set({ estoque: novoEstoque })
        .where(eq(produtos.id, item.id));

      // 🚀 Matemática explícita da saída
      logsDetalhesMontagem.push(`[${item.nome}: Tinha ${estoqueAntigo} ➡️ Saiu -${qtdKits} ➡️ Agora ${novoEstoque}]`);
    }

    await db.insert(produtos).values({
      codigoBarras: `KIT-${Date.now().toString().slice(-6)}`,
      nome: `🎁 Kit: ${nomeKit}`,
      // 🚀 Trocamos para " | " no lugar da vírgula para evitar erros na hora de desmanchar
      descricao: `Contém: ${nomesItens.join(' | ')}`,
      precoCusto: custoTotal,
      precoVenda: precoVendaKit,
      estoque: qtdKits,
    });

    await db.insert(logsSistema).values({
      descricao: `🎁 Kit "${nomeKit}" montado (${qtdKits} un.). Estoque reduzido: ${logsDetalhesMontagem.join(' | ')}`,
      data: new Date().toISOString(),
      categoria: 'produto',
      usuarioNome: nomeUsuario
    });

    redirect('/dashboard/produtos?msg=Kit promocional montado com sucesso e estoques atualizados!');
  }

  return (
    <div className="space-y-6 md:space-y-8">

      {/* BANNERS DE ALERTA (Sucesso e Erro) */}
      {msgSucesso && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-xl shadow-sm flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="font-bold text-sm md:text-base">{msgSucesso}</span>
          </div>
          <Link href="/dashboard/produtos" className="text-green-600 hover:text-green-800 font-bold p-2 text-xl" title="Fechar">&times;</Link>
        </div>
      )}

      {msgErro && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-xl shadow-sm flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">⚠️</span>
            <span className="font-black text-sm md:text-base tracking-wide">{msgErro}</span>
          </div>
          <Link href="/dashboard/produtos" className="text-red-600 hover:text-red-800 font-bold p-2 text-xl" title="Fechar">&times;</Link>
        </div>
      )}
      
      <div className="bg-gradient-to-r from-amber-50 to-white p-4 md:p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">📦</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-amber-900 text-lg uppercase tracking-wide">Como gerenciar o estoque?</h3>
          <p className="text-amber-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Preencha o formulário para cadastrar ou salvar alterações. <br/>
            <strong>2.</strong> Monte 🎁 Kits juntando produtos para vender em promoções especiais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* COLUNA ESQUERDA: Formulários */}
        <div className="flex flex-col gap-6 h-fit lg:sticky lg:top-8">
          
          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${produtoEditando ? 'bg-amber-500' : 'bg-[#6A283A]'}`}></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-black flex items-center gap-2 ${produtoEditando ? 'text-amber-600' : 'text-[#6A283A]'}`}>
                {produtoEditando ? <span>✏️ Editando Produto</span> : <span>➕ Cadastrar Produto</span>}
              </h2>
              {produtoEditando && (
                <Link href="/dashboard/produtos" className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg font-bold transition-colors">
                  Cancelar
                </Link>
              )}
            </div>
            
            <form key={produtoEditando?.id || 'novo_produto'} action={salvarProduto} className="space-y-4 md:space-y-5">
              <input type="hidden" name="id" value={produtoEditando?.id || ''} />

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <label className="block text-xs md:text-sm font-black text-zinc-700 mb-1">Código de Barras</label>
                <input 
                  id="codigoBarras" 
                  name="codigoBarras" 
                  defaultValue={produtoEditando?.codigoBarras || ''}
                  className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-white font-bold transition-all text-sm shadow-inner" 
                  placeholder="Digite ou use a câmera..." 
                />
                <BotaoCamera />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Nome do Perfume</label>
                <input name="nome" defaultValue={produtoEditando?.nome || ''} required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-[#E0DDDD]/10 focus:bg-white text-sm" placeholder="Ex: 212 VIP Rose" />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Descrição / Marca</label>
                <input name="descricao" defaultValue={produtoEditando?.descricao || ''} className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-[#E0DDDD]/10 focus:bg-white text-sm" placeholder="Ex: Carolina Herrera - 100ml" />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Custo (R$)</label>
                  <InputMoeda name="precoCusto" defaultValue={produtoEditando?.precoCusto} required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-[#E0DDDD]/10 focus:bg-white text-sm font-bold text-zinc-800" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Venda (R$)</label>
                  <InputMoeda name="precoVenda" defaultValue={produtoEditando?.precoVenda} required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-[#E0DDDD]/10 focus:bg-white text-sm font-bold text-zinc-800" />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Quantidade (Estoque)</label>
                <input name="estoque" type="number" defaultValue={produtoEditando?.estoque || ''} required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-[#E0DDDD]/10 focus:bg-white text-sm" placeholder="Ex: 10" />
              </div>

              <button type="submit" className={`w-full mt-4 text-white font-black py-3 md:py-4 px-4 rounded-lg transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base ${produtoEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#6A283A] hover:bg-[#521e2d]'}`}>
                {produtoEditando ? 'Salvar Alterações' : 'Salvar no Estoque'}
              </button>
            </form>
          </div>

          {/* FORMULÁRIO DE MONTAR KIT */}
          {!produtoEditando && (
            <div className="bg-amber-50 p-5 md:p-6 rounded-xl shadow-sm border border-amber-200 relative overflow-hidden">
              <h2 className="text-xl font-black text-amber-800 flex items-center gap-2 mb-4">
                <span>🎁</span> Montar Kit Especial
              </h2>
              <form action={montarKit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Nome do Kit</label>
                  <input name="nomeKit" required className="w-full p-2.5 border border-amber-200 rounded-lg outline-none focus:ring-amber-500 text-sm bg-white" placeholder="Ex: Kit Dia dos Namorados" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Preço Final (R$)</label>
                    <InputMoeda name="precoVendaKit" required className="w-full p-2.5 border border-amber-200 rounded-lg outline-none text-sm bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Qtd. de Kits</label>
                    <input name="qtdKits" type="number" defaultValue="1" required className="w-full p-2.5 border border-amber-200 rounded-lg outline-none text-sm bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Selecione os Produtos</label>
                  <div className="max-h-40 overflow-y-auto bg-white border border-amber-200 rounded-lg p-2 space-y-1 shadow-inner">
                    {listaProdutos.filter(p => !p.nome.startsWith('🎁')).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Nenhum perfume disponível para o kit.</p>
                    ) : (
                      listaProdutos.map(p => (
                        !p.nome.startsWith('🎁') && (
                          <label key={`kit-${p.id}`} className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded cursor-pointer transition-colors border-b border-zinc-100 last:border-none">
                            <input type="checkbox" name="produtosKit" value={p.id} className="accent-amber-600 w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-bold text-zinc-700 flex-1 truncate">
                              {p.nome} <span className="text-amber-600 font-black">(Est: {p.estoque})</span>
                            </span>
                          </label>
                        )
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-amber-700 mt-1.5 leading-tight font-medium">Ao salvar, os itens selecionados terão seu estoque reduzido automaticamente.</p>
                </div>

                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-4 rounded-lg transition-all shadow text-sm uppercase tracking-wide active:scale-95">
                  Criar Kit
                </button>
              </form>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Tabela/Cards */}
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 mb-6">
            <h2 className="text-xl font-black text-[#6A283A] flex items-center gap-2">
              <span>📋</span> Estoque Atual
            </h2>

            {/* O Campo Inteligente com o Filtro de Estoque Embutido */}
            <InputPesquisa />
          </div>
          
          {/* COMPUTADOR */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-[#E0DDDD]/30 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Produto</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Preço</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Estoque</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaProdutos.map((p) => (
                  <tr key={p.id} className={`${p.nome.startsWith('🎁') ? 'bg-amber-50/50' : 'hover:bg-[#EED9D4]/10'} transition-colors group`}>
                    <td className="p-3">
                      <p className="font-bold text-zinc-800 text-sm md:text-base">{p.nome}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{p.descricao}</p>
                      {p.codigoBarras && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono font-bold">📍 {p.codigoBarras}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-black text-green-700 text-sm md:text-base">
                      {Number(p.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-zinc-700 text-xs md:text-sm">{p.estoque} un.</span>
                        {p.estoque > 5 ? (
                          <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-md border border-green-200 uppercase">Adequado</span>
                        ) : p.estoque > 0 ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-200 uppercase">Baixo</span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded-md border border-red-200 uppercase">Falta</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <BotaoEditar produtoId={p.id} />
                        {isAdmin && (
                          <form action={excluirProduto}>
                            <input type="hidden" name="idExcluir" value={p.id} />
                            <BotaoExcluir />
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CELULAR */}
          <div className="block md:hidden space-y-3">
            {listaProdutos.map((p) => (
              <div key={`card-${p.id}`} className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between gap-3 ${p.nome.startsWith('🎁') ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-[#E0DDDD]'}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-zinc-800 text-base truncate">{p.nome}</p>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5 line-clamp-2">{p.descricao}</p>
                    {p.codigoBarras && (
                      <span className="inline-block mt-1 bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">📍 {p.codigoBarras}</span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-green-700 text-base">
                      {Number(p.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-zinc-700 text-xs">{p.estoque} un.</span>
                    {p.estoque > 5 ? (
                      <span className="bg-green-100 text-green-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-green-200 uppercase">OK</span>
                    ) : p.estoque > 0 ? (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-amber-200 uppercase animate-pulse">Baixo</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-red-200 uppercase">Falta</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <BotaoEditar produtoId={p.id} />
                    {isAdmin && (
                      <form action={excluirProduto}>
                        <input type="hidden" name="idExcluir" value={p.id} />
                        <BotaoExcluir />
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MENSAGEM SE A PESQUISA NÃO ENCONTRAR NADA */}
          {listaProdutos.length === 0 && (
            <div className="p-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl mt-4">
              <div className="text-4xl mb-3 opacity-50">📭</div>
              <p className="text-zinc-500 font-medium text-sm">
                Nenhum produto encontrado para a pesquisa atual.
              </p>
              {(q || filtroEstoque !== 'todos') && (
                <Link href="/dashboard/produtos" className="inline-block mt-4 text-[#6A283A] font-bold text-xs uppercase hover:underline">
                  Ver todo o estoque
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}