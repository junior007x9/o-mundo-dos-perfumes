// app/dashboard/caixa/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { getCaixaAberto, getVendasDoCaixa, getProdutosPDV, getClientesPDV, abrirCaixa, fecharCaixa, finalizarVenda, cadastrarClientePDV } from './actions';
import { getUsuarioLogado } from '@/app/actions';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [vendasCaixa, setVendasCaixa] = useState<any[]>([]);
  const [vendedorLogado, setVendedorLogado] = useState<any>(null);

  const [clientesDB, setClientesDB] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  
  const [modalCliente, setModalCliente] = useState(false);
  const [nomeCli, setNomeCli] = useState('');
  const [telefoneCli, setTelefoneCli] = useState('');
  const [dataNascCli, setDataNascCli] = useState('');
  const [salvandoCli, setSalvandoCli] = useState(false);

  const [vendaSucesso, setVendaSucesso] = useState<boolean>(false);
  const [dadosUltimaVenda, setDadosUltimaVenda] = useState<any>(null);

  const [processandoVenda, setProcessandoVenda] = useState(false);

  const [buscaTexto, setBuscaTexto] = useState('');
  const [cameraAberta, setCameraAberta] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  const [pagamento, setPagamento] = useState('dinheiro');
  const [valorRecebido, setValorRecebido] = useState<number | string>('');

  const [desconto, setDesconto] = useState<number | string>('');
  const [valoresMultiplos, setValoresMultiplos] = useState({ dinheiro: '', pix: '', credito: '', debito: '' });
  
  const [observacaoDireta, setObservacaoDireta] = useState('');
  const [observacaoMultipla, setObservacaoMultipla] = useState(''); 

  const [modalFechamento, setModalFechamento] = useState(false);
  const [mostrarTutorial, setMostrarTutorial] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const caixaAtual = await getCaixaAberto();
      const listaProdutos = await getProdutosPDV();
      const listaClientes = await getClientesPDV(); 
      const usuario = await getUsuarioLogado(); 
      
      setCaixa(caixaAtual);
      setProdutos(listaProdutos);
      setClientesDB(listaClientes);
      setVendedorLogado(usuario);

      if (caixaAtual) {
        const vendasDb = await getVendasDoCaixa(caixaAtual.id);
        setVendasCaixa(vendasDb);
      }
      setCarregando(false);
    }
    carregarDados();
  }, []);

  // 🚀 TIMEOUT DE SEGURANÇA E REMOÇÃO DE DISTORÇÃO DE ASPECTO (CORRIGIDO)
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (cameraAberta) {
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("leitor-camera");
          const config = { 
            fps: 20, 
            qrbox: { width: 280, height: 160 }, // Retângulo perfeito focado em códigos lineares de perfumes
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE
            ]
          };

          html5QrCode.start(
            { facingMode: "environment" },
            config,
            (codigoLido) => {
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  setCameraAberta(false);
                  setBuscaTexto(codigoLido);
                  processarBuscaProduto(codigoLido);
                }).catch(err => console.error("Erro ao parar a câmera", err));
              }
            },
            () => {} // Ignora erros de frame contínuos
          ).catch((err) => {
            console.error("Erro ao iniciar câmera", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            setCameraAberta(false);
          });
        } catch (e) {
          console.error("Erro de inicialização do container de vídeo", e);
        }
      }, 300); // Aguarda o modal assentar na tela

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {});
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAberta]);

  const formataMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarPagamento = (pag: string) => {
    if (!pag) return 'DINHEIRO';
    if (pag === 'credito') return 'CARTÃO DE CRÉDITO';
    if (pag === 'debito') return 'CARTÃO DE DÉBITO';
    
    if (pag === 'venda_direta' || pag.startsWith('venda_direta:')) {
      return 'VENDA DIRETA (PARCELADO) 📝';
    }
    
    if (pag.startsWith('multiplo:')) {
      const partes = pag.replace('multiplo:', '').split(';');
      const listaFormatada: string[] = [];
      partes.forEach(p => {
        const [k, v] = p.split('=');
        if (k !== 'obs' && Number(v) > 0) {
          const nome = k === 'dinheiro' ? 'Dinheiro' : k === 'pix' ? 'PIX' : k === 'credito' ? 'Crédito' : 'Débito';
          listaFormatada.push(`${nome}: R$ ${Number(v).toFixed(2)}`);
        }
      });
      return `MÚLTIPLO (${listaFormatada.join(' + ')})`;
    }
    return pag.toUpperCase();
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setTelefoneCli(v.substring(0, 15));
  };

  const handleDataNascChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 2 && v.length <= 4) {
      v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
    } else if (v.length > 4) {
      v = v.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
    }
    setDataNascCli(v.substring(0, 10));
  };

  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCli.trim()) return alert("O nome do cliente é obrigatório!");
    setSalvandoCli(true);
    try {
      const novoId = await cadastrarClientePDV(nomeCli, telefoneCli, dataNascCli);
      const atualizados = await getClientesPDV(); 
      setClientesDB(atualizados);
      setClienteSelecionado(novoId.toString());
      setModalCliente(false);
      setNomeCli('');
      setTelefoneCli('');
      setDataNascCli('');
    } catch(err) {
      alert("Erro ao cadastrar cliente.");
    }
    setSalvandoCli(false);
  };

  const adicionarAoCarrinho = (produto: any) => {
    if (produto.estoque <= 0) {
      alert('Produto sem estoque!');
      return;
    }
    const itemExistente = carrinho.find((item) => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, grandfather: true, quantidade: item.quantidade + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  const processarBuscaProduto = (termoBusca: string) => {
    if (!termoBusca.trim()) return;
    const termo = termoBusca.toLowerCase();
    const prodEncontrado = produtos.find(p => 
      p.codigoBarras === termoBusca || 
      String(p.nome || '').toLowerCase().includes(termo) ||
      String(p.marca || '').toLowerCase().includes(termo) ||
      String(p.precoVenda || '').includes(termo)
    );
    if (prodEncontrado) {
      adicionarAoCarrinho(prodEncontrado);
      setBuscaTexto('');
    } else {
      alert('Produto não encontrado no sistema!');
    }
    if (inputBuscaRef.current) inputBuscaRef.current.focus();
  };

  const removerDoCarrinho = (id: number) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const totalCompra = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);
  const totalComDesconto = Math.max(0, totalCompra - (Number(desconto) || 0));

  const totalPreenchidoMultiplo = 
    (Number(valoresMultiplos.dinheiro) || 0) +
    (Number(valoresMultiplos.pix) || 0) +
    (Number(valoresMultiplos.credito) || 0) +
    (Number(valoresMultiplos.debito) || 0);

  const faltaPagarMultiplo = totalComDesconto - totalPreenchidoMultiplo;
  const trocoMultiplo = faltaPagarMultiplo < 0 && (Number(valoresMultiplos.dinheiro) || 0) >= Math.abs(faltaPagarMultiplo) ? Math.abs(faltaPagarMultiplo) : 0;
  const multiploValido = totalPreenchidoMultiplo === totalComDesconto || (totalPreenchidoMultiplo > totalComDesconto && (Number(valoresMultiplos.dinheiro) || 0) >= trocoMultiplo);

  const botaoDesabilitado = carrinho.length === 0 || 
    (pagamento === 'multiplo' ? !multiploValido : 
    (pagamento === 'dinheiro' && valorRecebido !== '' && Number(valorRecebido) < totalComDesconto) ||
    (pagamento === 'venda_direta' && !clienteSelecionado)); 

  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0 || processandoVenda) return;
    setProcessandoVenda(true);

    try {
      const formaEnvio = pagamento === 'multiplo'
        ? `multiplo:dinheiro=${(Number(valoresMultiplos.dinheiro) || 0) - trocoMultiplo};pix=${Number(valoresMultiplos.pix) || 0};credito=${Number(valoresMultiplos.credito) || 0};debito=${Number(valoresMultiplos.debito) || 0}${observacaoMultipla.trim() ? `;obs=${observacaoMultipla.replace(/[:;=]/g, ' ')}` : ''}`
        : pagamento === 'venda_direta' && observacaoDireta.trim()
          ? `venda_direta:obs=${observacaoDireta.replace(/[:;=]/g, ' ')}`
          : pagamento;

      const clienteObj = clientesDB.find(c => c.id.toString() === clienteSelecionado);

      setDadosUltimaVenda({ 
        itens: [...carrinho], 
        total: totalComDesconto, 
        data: new Date().toISOString(),
        pagamento: formaEnvio,
        clienteNome: clienteObj ? clienteObj.nome : 'Consumidor Final',
        vendedorNome: vendedorLogado ? vendedorLogado.nome : 'Sistema'
      });
      
      const idCliente = clienteSelecionado ? Number(clienteSelecionado) : undefined;
      const idVendedor = vendedorLogado ? Number(vendedorLogado.id) : undefined;
      
      await finalizarVenda(caixa.id, carrinho, totalComDesconto, formaEnvio, idCliente, idVendedor);
      
      const vendasAtualizadas = await getVendasDoCaixa(caixa.id);
      setVendasCaixa(vendasAtualizadas);

      setCarrinho([]);
      setValorRecebido('');
      setDesconto('');
      setValoresMultiplos({ dinheiro: '', pix: '', credito: '', debito: '' });
      setObservacaoDireta('');
      setObservacaoMultipla(''); 
      setPagamento('dinheiro');
      setClienteSelecionado(''); 
      setVendaSucesso(true);
      
      const novaLista = await getProdutosPDV();
      setProdutos(novaLista);
    } catch (error) {
      alert("Erro ao processar venda.");
    } finally {
      setProcessandoVenda(false);
    }
  };

  const dispararImpressaoTermica = () => {
    if (!dadosUltimaVenda) return;
    const popup = window.open('', '_blank', 'width=300,height=600');
    if (!popup) return alert('Por favor, autorize pop-ups para realizar a impressão!');
    const urlDaLogo = `${window.location.origin}/logo.png`;
    popup.document.write(`
      <html>
        <head><style>@page{margin:0;} body{font-family:monospace;font-size:12px;padding:12px;width:58mm;margin:0;} .center{text-align:center;} .right{text-align:right;} .bold{font-weight:bold;} .divider{border-bottom:1px dashed #000;margin:6px 0;} table{width:100%;border-collapse:collapse;margin-top:4px;} td{font-size:11px;vertical-align:top;}</style></head>
        <body>
          <div class="center"><img src="${urlDaLogo}" style="max-width:32mm;" /></div>
          <div class="center bold" style="font-size:13px; margin-top:4px;">O MUNDO DOS PERFUMES</div>
          <div class="divider"></div><div>DATA: ${new Date(dadosUltimaVenda.data).toLocaleString('pt-BR')}</div>
          <div>ATENDENTE: ${dadosUltimaVenda.vendedorNome.toUpperCase()}</div>
          <div>CLIENTE: ${dadosUltimaVenda.clienteNome.toUpperCase()}</div>
          <div class="divider"></div>
          <table><tbody>${dadosUltimaVenda.itens.map((i: any) => `<tr><td>${i.quantidade}x ${i.nome.substring(0,16)}</td><td class="right">R$ ${(i.quantidade * i.precoVenda).toFixed(2)}</td></tr>`).join('')}</tbody></table>
          <div class="divider"></div><div class="right bold">TOTAL: R$ ${dadosUltimaVenda.total.toFixed(2)}</div>
          <div class="divider"></div><div class="center">OBRIGADO PELA PREFERÊNCIA!</div>
          <script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const enviarWhatsApp = () => {
    if (!dadosUltimaVenda) return;
    let texto = `*O MUNDO DOS PERFUMES* 🛍*\nOlá ${dadosUltimaVenda.clienteNome !== 'Consumidor Final' ? dadosUltimaVenda.clienteNome : ''}! Obrigado pela preferência!\n\n*Atendente:* ${dadosUltimaVenda.vendedorNome}\n\n*Recibo da Compra:*\n`;
    dadosUltimaVenda.itens.forEach((i: any) => {
      texto += `▪ ${i.quantidade}x ${i.nome} - R$ ${(i.quantidade * i.precoVenda).toFixed(2)}\n`;
    });
    texto += `\n*Total Pago:* R$ ${dadosUltimaVenda.total.toFixed(2)}\n\nVolte Sempre! ✨`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const vendasValidas = vendasCaixa.filter(v => v.status !== 'cancelada');
  const obterValorPorForma = (forma: string, tipo: string, totalVenda: number) => {
    if (!forma) return 0;
    const f = String(forma).toLowerCase();
    if (f.startsWith('multiplo:')) {
      const partes = f.replace('multiplo:', '').split(';');
      for (const p of partes) {
        const [k, v] = p.split('=');
        if (k === tipo) return Number(v) || 0;
      }
      return 0;
    }
    if (tipo === 'venda_direta' && f.startsWith('venda_direta')) return totalVenda;
    return f === tipo ? totalVenda : 0;
  };

  const resumoTurno = {
    dinheiro: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPagamento, 'dinheiro', v.total), 0),
    pix: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPagamento, 'pix', v.total), 0),
    credito: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPagamento, 'credito', v.total), 0),
    debito: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPagamento, 'debito', v.total), 0),
    venda_direta: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPagamento, 'venda_direta', v.total), 0),
  };
  const totalVendidoTurno = resumoTurno.dinheiro + resumoTurno.pix + resumoTurno.credito + resumoTurno.debito + resumoTurno.venda_direta;

  const handleFecharCaixa = async () => {
    await fecharCaixa(caixa.id, caixa.saldoInicial + totalVendidoTurno);
    setCaixa(null);
    setModalFechamento(false);
  };

  const produtosFiltrados = produtos.filter((p) => {
    if (!buscaTexto.trim()) return true;
    const termo = buscaTexto.toLowerCase();
    return String(p.nome || '').toLowerCase().includes(termo) ||
           String(p.codigoBarras || '').toLowerCase().includes(termo) ||
           String(p.marca || '').toLowerCase().includes(termo);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-6rem)] gap-3 md:gap-4 overflow-hidden min-h-0">
      
      {modalCliente && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-2xl text-[#6A283A] mb-2">Novo Cliente 👤</h3>
            <form onSubmit={handleSalvarCliente} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Nome Completo *</label>
                <input type="text" required value={nomeCli} onChange={e => setNomeCli(e.target.value)} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">WhatsApp</label>
                <input type="text" value={telefoneCli} onChange={handleTelefoneChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Data de Nascimento</label>
                <input type="text" value={dataNascCli} onChange={handleDataNascChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm" placeholder="DD/MM/AAAA" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCliente(false)} className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-3 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={salvandoCli} className="flex-[2] bg-[#6A283A] text-white font-black py-3 rounded-xl uppercase text-sm">{salvandoCli ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalFechamento && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-2xl text-[#6A283A] mb-2">Resumo do Dia 📊</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex justify-between items-center"><span>💵 Dinheiro:</span><span className="font-black">{formataMoeda(resumoTurno.dinheiro)}</span></div>
              <div className="flex justify-between items-center"><span>💠 PIX:</span><span className="font-black">{formataMoeda(resumoTurno.pix)}</span></div>
              <div className="flex justify-between items-center"><span>💳 Crédito:</span><span className="font-black text-blue-700">{formataMoeda(resumoTurno.credito)}</span></div>
              <div className="flex justify-between items-center"><span>💳 Débito:</span><span className="font-black text-teal-700">{formataMoeda(resumoTurno.debito)}</span></div>
              <div className="flex justify-between items-center border-t border-dashed border-zinc-200 pt-2 text-[#6A283A]"><span>📝 Venda Direta:</span><span className="font-black">{formataMoeda(resumoTurno.venda_direta)}</span></div>
              <div className="border-t border-zinc-200 pt-3 mt-3 flex justify-between items-center text-[#6A283A]"><span className="font-black text-sm">Total Vendido:</span><span className="font-black text-2xl">{formataMoeda(totalVendidoTurno)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalFechamento(false)} className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-3 rounded-xl text-sm">Voltar</button>
              <button onClick={handleFecharCaixa} className="flex-[2] bg-red-600 text-white font-black py-3 rounded-xl text-sm uppercase">Encerrar Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE SCANNER DA CÂMARA */}
      {cameraAberta && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Aponte para o Código</h2>
            {/* O container interno do leitor */}
            <div id="leitor-camera" className="w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/20"></div>
            <button onClick={() => setCameraAberta(false)} className="w-full bg-white/10 text-white font-bold py-4 rounded-xl uppercase">✖ Fechar Lente</button>
          </div>
        </div>
      )}

      {mostrarTutorial && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-white p-3 rounded-xl border border-blue-200 flex items-center gap-3 relative">
          <button onClick={() => setMostrarTutorial(false)} className="absolute top-2 right-2 text-blue-400 hover:text-red-500 font-bold text-xs">✖</button>
          <div className="flex-1 pr-6">
            <h3 className="font-black text-blue-900 text-xs uppercase tracking-wide">Como registrar uma venda?</h3>
            <div className="text-blue-800/80 text-[11px] md:text-xs mt-1 font-medium flex flex-col md:flex-row md:gap-4 gap-1">
              <p><strong>1</strong> Adicione os produtos. <strong>2</strong> Informe desconto ou cliente. <strong>3</strong> Conclua!</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-[#E0DDDD] flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
          <input 
            ref={inputBuscaRef} type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)}
            placeholder="Buscar por nome, marca, código ou preço..."
            className="w-full pl-9 p-3 border border-[#E0DDDD] rounded-lg font-bold text-sm outline-none"
            autoFocus
          />
        </div>
        <button onClick={() => setCameraAberta(true)} className="bg-[#6A283A] text-white px-4 py-2 rounded-lg font-black uppercase text-sm flex items-center gap-2 hover:bg-[#521e2d] transition-colors">
          <span>📷</span> <span>Ler Código</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 bg-white flex flex-col rounded-xl shadow-sm border border-[#E0DDDD] min-h-0 overflow-hidden">
          <div className="flex-shrink-0 flex justify-between items-center p-3 border-b border-[#E0DDDD] bg-zinc-50">
            <h2 className="text-lg font-black text-[#6A283A]">Catálogo Rápido</h2>
            <button onClick={() => setModalFechamento(true)} className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full uppercase">🔒 Fechar Caixa</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {produtosFiltrados.map((p) => (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} disabled={p.estoque <= 0} className={`p-3 border-2 rounded-xl text-left flex flex-col justify-between ${p.estoque > 0 ? 'border-[#E0DDDD] bg-white hover:bg-[#f9f1f0]' : 'border-zinc-200 opacity-50 bg-zinc-100 cursor-not-allowed'}`}>
                  <div>
                    <h3 className="font-bold text-zinc-800 text-xs leading-tight line-clamp-2 h-8">{p.nome}</h3>
                    <p className="text-[10px] font-semibold text-zinc-500 mt-1">Estoque: {p.estoque}</p>
                  </div>
                  <p className="text-sm font-black text-[#6A283A] mt-1.5 border-t border-zinc-100 pt-1 w-full">{formataMoeda(p.precoVenda)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 bg-zinc-50 flex flex-col rounded-xl border border-[#E0DDDD] min-h-0 overflow-hidden">
          <div className="flex-shrink-0 bg-[#6A283A] text-white p-3 flex justify-between items-center">
            <h2 className="text-sm font-black uppercase">🛒 Cupom Fiscal</h2>
            <span className="bg-white text-[#6A283A] font-black px-2 py-0.5 rounded text-xs">{carrinho.length} Itens</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white min-h-[100px]">
            {carrinho.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                <span className="text-4xl">🛍️</span><p className="font-medium text-sm">O carrinho está vazio</p>
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-zinc-800 text-xs leading-tight">{item.nome}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5"><strong>{item.quantidade}x</strong> {formataMoeda(item.precoVenda)}</p>
                  </div>
                  <div className="flex items-center gap-3 pl-2 border-l border-zinc-100">
                    <span className="font-black text-[#6A283A] text-sm whitespace-nowrap">{formataMoeda(item.quantidade * item.precoVenda)}</span>
                    <button onClick={() => removerDoCarrinho(item.id)} className="text-red-500 font-bold text-sm">✖</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex-shrink-0 bg-white border-t-2 border-zinc-200 p-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5 block">🏷️ Desconto (R$)</label>
                <input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} placeholder="0.00" className="w-full p-2 rounded bg-zinc-50 font-bold border border-zinc-300 text-xs" />
              </div>
              <div>
                <div className="flex justify-between items-end mb-0.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Vincular Cliente</label>
                  <button type="button" onClick={() => setModalCliente(true)} className="text-[9px] font-black text-[#6A283A] bg-[#EED9D4]/50 px-1.5 py-0.5 rounded">➕ NOVO</button>
                </div>
                <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)} className="w-full p-2 rounded bg-zinc-50 font-bold border border-zinc-300 text-xs">
                  <option value="">👤 Consumidor Final</option>
                  {clientesDB.map(c => <option key={c.id} value={c.id}>{c.nome.substring(0, 15)}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5 block">Forma de Pagamento</label>
              <select value={pagamento} onChange={(e) => { setPagamento(e.target.value); setValorRecebido(''); }} className="w-full p-2 rounded bg-zinc-50 font-bold border border-zinc-300 text-xs">
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">💠 PIX</option>
                <option value="credito">💳 Cartão de Crédito</option>
                <option value="debito">💳 Cartão de Débito</option>
                <option value="venda_direta">📝 Venda Direta (Parcelado)</option>
                <option value="multiplo">🔀 Múltiplas Formas</option>
              </select>
            </div>

            {pagamento === 'venda_direta' && (
              <div className="mb-2">
                <input type="text" value={observacaoDireta} onChange={(e) => setObservacaoDireta(e.target.value)} placeholder="Ex: Combinado 3x de R$ 50" className="w-full p-2 rounded bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs outline-none" />
              </div>
            )}

            {pagamento === 'dinheiro' && (
              <div className="grid grid-cols-2 gap-2 mb-2 items-end">
                <input type="number" step="0.01" value={valorRecebido} placeholder="Recebido (R$)" onChange={(e) => setValorRecebido(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 rounded bg-white border border-[#6A283A] text-[#6A283A] font-black text-sm" />
                {Number(valorRecebido) >= totalComDesconto && totalComDesconto > 0 && (
                  <div className="h-[36px] px-2 bg-green-100 rounded flex justify-between items-center text-xs font-bold text-green-700">
                    <span>Troco: {formataMoeda(Number(valorRecebido) - totalComDesconto)}</span>
                  </div>
                )}
              </div>
            )}

            {pagamento === 'multiplo' && (
              <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200 mb-2 grid grid-cols-2 gap-2 text-xs font-bold">
                <input type="number" step="0.01" value={valoresMultiplos.dinheiro} onChange={(e) => setValoresMultiplos({...valoresMultiplos, dinheiro: e.target.value})} className="w-full p-1.5 rounded border" placeholder="💵 Dinheiro" />
                <input type="number" step="0.01" value={valoresMultiplos.pix} onChange={(e) => setValoresMultiplos({...valoresMultiplos, pix: e.target.value})} className="w-full p-1.5 rounded border" placeholder="💠 PIX" />
                <input type="number" step="0.01" value={valoresMultiplos.credito} onChange={(e) => setValoresMultiplos({...valoresMultiplos, credito: e.target.value})} className="w-full p-1.5 rounded border" placeholder="💳 Crédito" />
                <input type="number" step="0.01" value={valoresMultiplos.debito} onChange={(e) => setValoresMultiplos({...valoresMultiplos, debito: e.target.value})} className="w-full p-1.5 rounded border" placeholder="💳 Débito" />
                <input type="text" value={observacaoMultipla} onChange={(e) => setObservacaoMultipla(e.target.value)} className="col-span-2 p-1.5 rounded border outline-none" placeholder="Observações da divisão..." />
              </div>
            )}

            <div className="flex items-stretch gap-2 mt-1">
              <div className="flex-[1.4] bg-zinc-100 border border-zinc-200 rounded-lg p-1.5 flex flex-col justify-center items-center">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">A Pagar</span>
                <span className="text-xl font-black text-[#6A283A]">{formataMoeda(totalComDesconto)}</span>
              </div>
              <button onClick={handleFinalizarVenda} disabled={botaoDesabilitado || processandoVenda} className="flex-[2] bg-[#6A283A] text-white font-black rounded-lg disabled:opacity-50 uppercase text-sm">
                {processandoVenda ? '⏳ Gravando...' : '✅ Finalizar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}