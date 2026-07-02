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

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (cameraAberta) {
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("leitor-camera");
          const config = { 
            fps: 20, 
            qrbox: { width: 280, height: 160 },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
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
            () => {} 
          ).catch((err) => {
            console.error("Erro ao iniciar câmera", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            setCameraAberta(false);
          });
        } catch (e) {
          console.error("Erro de inicialização do container de vídeo", e);
        }
      }, 300); 

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
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item));
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
      console.error("Erro ao salvar a venda:", error);
      alert("Ocorreu um erro na rede ao salvar a venda. Tente novamente.");
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
          <div class="right" style="font-size:10px; margin-top:2px;">PAGO NO: ${dadosUltimaVenda.pagamento.startsWith('venda_direta') ? 'VENDA DIRETA (PARCELADO)' : formatarPagamento(dadosUltimaVenda.pagamento)}</div>
          <div class="divider"></div><div class="center">OBRIGADO PELA PREFERÊNCIA!</div>
          <script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const enviarWhatsApp = () => {
    if (!dadosUltimaVenda) return;
    let texto = `*O MUNDO DOS PERFUMES* 🛍️\nOlá ${dadosUltimaVenda.clienteNome !== 'Consumidor Final' ? dadosUltimaVenda.clienteNome : ''}! Obrigado pela preferência!\n\n*Atendente:* ${dadosUltimaVenda.vendedorNome}\n\n*Recibo da Compra:*\n`;
    dadosUltimaVenda.itens.forEach((i: any) => {
      texto += `▪ ${i.quantidade}x ${i.nome} - R$ ${(i.quantidade * i.precoVenda).toFixed(2)}\n`;
    });
    texto += `\n*Total Pago:* R$ ${dadosUltimaVenda.total.toFixed(2)}`;
    texto += `\n*Forma de Pagamento:* ${dadosUltimaVenda.pagamento.startsWith('venda_direta') ? 'VENDA DIRETA (PARCELADO)' : formatarPagamento(dadosUltimaVenda.pagamento)}\n\nVolte Sempre! ✨`;
    
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
    dinheiro: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPayment || v.formaPagamento, 'dinheiro', v.total), 0),
    pix: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPayment || v.formaPagamento, 'pix', v.total), 0),
    credito: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPayment || v.formaPagamento, 'credito', v.total), 0),
    debito: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPayment || v.formaPagamento, 'debito', v.total), 0),
    venda_direta: vendasValidas.reduce((acc, v) => acc + obterValorPorForma(v.formaPayment || v.formaPagamento, 'venda_direta', v.total), 0),
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
    
    const matchNome = String(p.nome || '').toLowerCase().includes(termo);
    const matchBarra = String(p.codigoBarras || '').toLowerCase().includes(termo);
    const matchMarca = String(p.marca || '').toLowerCase().includes(termo);
    const matchPreco = String(p.precoVenda || '').includes(termo);

    return matchNome || matchBarra || matchMarca || matchPreco;
  });

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold text-lg">Carregando PDV...</div>;

  if (!caixa) {
    return (
      <div className="max-w-md mx-auto mt-10 md:mt-20 bg-white p-6 md:p-8 rounded-xl shadow-xl border border-[#E0DDDD] text-center">
        <div className="text-5xl mb-4 animate-pulse">🔒</div>
        <h2 className="text-2xl font-black text-[#6A283A] mb-2">Caixa Fechado</h2>
        <p className="text-zinc-500 mb-6 font-medium">É necessário abrir o caixa e informar o troco inicial.</p>
        <form action={abrirCaixa} onSubmit={() => setTimeout(() => window.location.reload(), 1000)}>
          <input name="saldoInicial" type="number" step="0.01" defaultValue="0" required className="w-full p-4 border border-[#E0DDDD] bg-zinc-50 focus:ring-2 focus:ring-[#6A283A] rounded-lg mb-6 text-center text-2xl font-bold outline-none text-zinc-800" />
          <button type="submit" className="w-full bg-[#6A283A] text-white font-black py-4 rounded-lg hover:bg-[#521e2d] transition-all uppercase flex justify-center items-center gap-2 text-lg shadow-md">
            🔑 Abrir Caixa Agora
          </button>
        </form>
      </div>
    );
  }

  if (vendaSucesso) {
    return (
      <div className="max-w-md mx-auto mt-10 md:mt-20 bg-white p-8 rounded-2xl shadow-xl border border-green-200 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">✓</div>
        <h2 className="text-3xl font-black text-green-800 uppercase">Venda Feita!</h2>
        <p className="text-zinc-600 mt-2 mb-8 text-lg">Pagamento registrado com sucesso.</p>
        <div className="space-y-4">
          <button onClick={dispararImpressaoTermica} className="w-full bg-[#6A283A] text-white font-black py-4 rounded-xl hover:bg-[#521e2d] transition-all uppercase shadow-md flex items-center justify-center gap-2 text-lg">
            🖨️ Imprimir Recibo
          </button>
          <button onClick={enviarWhatsApp} className="w-full bg-[#25D366] text-white font-black py-4 rounded-xl hover:bg-[#128C7E] transition-all uppercase shadow-md flex items-center justify-center gap-2 text-lg">
            📱 Enviar no WhatsApp
          </button>
          <button onClick={() => setVendaSucesso(false)} className="w-full bg-zinc-100 text-zinc-800 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all uppercase mt-4 text-lg">
            🛒 Fazer Nova Venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-4 lg:h-[calc(100vh-5rem)] xl:h-[calc(100vh-6rem)] lg:overflow-hidden pb-10 lg:pb-0">
      
      {modalCliente && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-2xl text-[#6A283A] mb-2">Novo Cliente 👤</h3>
            <p className="text-zinc-500 text-sm mb-6">Cadastre rapidamente para vincular à venda.</p>
            <form onSubmit={handleSalvarCliente} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Nome Completo *</label>
                <input type="text" required value={nomeCli} onChange={e => setNomeCli(e.target.value)} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">WhatsApp</label>
                <input type="text" value={telefoneCli} onChange={handleTelefoneChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Data de Nascimento</label>
                <input type="text" value={dataNascCli} onChange={handleDataNascChange} className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-300 font-bold text-sm outline-none focus:ring-2 focus:ring-[#6A283A]" placeholder="DD/MM/AAAA" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCliente(false)} className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-3 rounded-xl hover:bg-zinc-300 transition-colors uppercase text-sm">Cancelar</button>
                <button type="submit" disabled={salvandoCli} className="flex-[2] bg-[#6A283A] text-white font-black py-3 rounded-xl hover:bg-[#521e2d] transition-colors uppercase shadow-md text-sm disabled:opacity-50">{salvandoCli ? 'Salvando...' : 'Salvar e Vincular'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalFechamento && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-2xl text-[#6A283A] mb-2">Resumo do Dia 📊</h3>
            <p className="text-zinc-500 text-sm mb-6">Confira os valores antes de encerrar o caixa.</p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-bold">💵 Dinheiro:</span>
                <span className="font-black text-lg">{formataMoeda(resumoTurno.dinheiro)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-bold">💠 PIX:</span>
                <span className="font-black text-lg">{formataMoeda(resumoTurno.pix)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-bold">💳 Crédito:</span>
                <span className="font-black text-lg text-blue-700">{formataMoeda(resumoTurno.credito)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-bold">💳 Débito:</span>
                <span className="font-black text-lg text-teal-700">{formataMoeda(resumoTurno.debito)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-700 border-t border-dashed border-zinc-200 pt-2 text-[#6A283A]">
                <span className="font-bold">📝 Venda Direta:</span>
                <span className="font-black text-lg">{formataMoeda(resumoTurno.venda_direta)}</span>
              </div>
              <div className="border-t border-zinc-200 pt-3 mt-3 flex justify-between items-center text-[#6A283A]">
                <span className="font-black uppercase text-sm">Total Vendido:</span>
                <span className="font-black text-2xl">{formataMoeda(totalVendidoTurno)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalFechamento(false)} className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-3 rounded-xl hover:bg-zinc-300 transition-colors uppercase text-sm">Voltar</button>
              <button onClick={handleFecharCaixa} className="flex-[2] bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors uppercase shadow-md text-sm">Encerrar Caixa</button>
            </div>
          </div>
        </div>
      )}

      {cameraAberta && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center">Lendo Código<br/><span className="text-xs font-normal text-zinc-400">Aponte a câmara para a etiqueta</span></h2>
            <div id="leitor-camera" className="w-full aspect-video bg-black rounded-xl border border-white/20"></div>
            <button onClick={() => setCameraAberta(false)} className="w-full bg-white/10 text-white font-bold py-4 rounded-xl uppercase">✖ Cancelar Leitura</button>
          </div>
        </div>
      )}

      {mostrarTutorial && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-white p-3 rounded-xl border border-blue-200 shadow-sm flex items-center gap-3 relative">
          <button onClick={() => setMostrarTutorial(false)} className="absolute top-2 right-2 text-blue-400 hover:text-red-500 font-bold text-xs">✖</button>
          <div className="flex-1 pr-6">
            <h3 className="font-black text-blue-900 text-xs uppercase tracking-wide">Como registrar uma venda?</h3>
            <div className="text-blue-800/80 text-[11px] md:text-xs mt-1 font-medium flex flex-col md:flex-row md:gap-4 gap-1">
              <p><strong>1</strong> Adicione os produtos no catálogo.</p>
              <p><strong>2</strong> Informe desconto ou cliente caso aplicável.</p>
              <p><strong>3</strong> Escolha o pagamento (simples ou múltiplo) e conclua!</p>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CORREÇÃO 1: BARRA DE PESQUISA COM O ÍCONE BEM SEPARADO DO TEXTO */}
      <div className="flex-shrink-0 bg-white p-2 md:p-3 rounded-xl shadow-sm border border-[#E0DDDD] flex gap-2">
        <div className="relative flex-1">
          {/* Ícone fixo de fundo */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-zinc-400 text-lg">🔍</span>
          </div>
          <input 
            ref={inputBuscaRef} type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)}
            placeholder="Buscar por nome, marca, código..."
            // Aumentamos o padding-left (pl-12) para que o texto só comece depois da lupa
            className="w-full pl-12 pr-4 py-3 md:py-3 border border-[#E0DDDD] rounded-lg focus:ring-2 focus:ring-[#6A283A] outline-none font-bold text-sm md:text-base transition-all"
            autoFocus
          />
        </div>
        <button onClick={() => setCameraAberta(true)} className="bg-[#6A283A] text-white px-4 md:px-5 py-2 md:py-3 rounded-lg font-black uppercase text-sm md:text-base flex items-center gap-2 hover:bg-[#521e2d] transition-colors">
          <span className="text-xl">📷</span> <span className="hidden sm:inline">Ler Código</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        
        <div className="bg-white flex flex-col rounded-xl shadow-sm border border-[#E0DDDD] h-[35vh] lg:h-auto lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          <div className="flex-shrink-0 flex justify-between items-center p-3 border-b border-[#E0DDDD] bg-zinc-50">
            <h2 className="text-lg font-black text-[#6A283A]">Catálogo Rápido</h2>
            <button onClick={() => setModalFechamento(true)} className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full uppercase shadow-sm">🔒 Fechar Caixa</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {produtosFiltrados.map((p) => (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} disabled={p.estoque <= 0} className={`p-3 border-2 rounded-xl text-left transition-all flex flex-col justify-between ${p.estoque > 0 ? 'border-[#E0DDDD] hover:border-[#6A283A] bg-white hover:bg-[#f9f1f0] active:scale-95 shadow-sm' : 'border-zinc-200 opacity-50 bg-zinc-100 cursor-not-allowed'}`}>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-xs md:text-sm leading-tight line-clamp-2 h-8">{p.nome}</h3>
                    {p.marca && <p className="text-[9px] md:text-[10px] font-black text-purple-600 uppercase mt-0.5 line-clamp-1">{p.marca}</p>}
                    <p className="text-[10px] md:text-xs font-semibold text-zinc-500 mt-1">Estoque: {p.estoque}</p>
                  </div>
                  <p className="text-sm md:text-base font-black text-[#6A283A] mt-1.5 border-t border-zinc-100 pt-1 w-full">{formataMoeda(p.precoVenda)}</p>
                </button>
              ))}
              {produtosFiltrados.length === 0 && (
                <div className="col-span-full p-8 text-center text-zinc-400 font-medium text-sm flex flex-col items-center">
                  <span className="text-3xl mb-2">🤔</span>
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] xl:w-[420px] bg-zinc-50 flex flex-col rounded-xl shadow-xl lg:shadow-none border border-[#E0DDDD] lg:flex-shrink-0 lg:min-h-0 lg:overflow-hidden mb-6 lg:mb-0">
          
          <div className="flex-shrink-0 bg-[#6A283A] text-white p-3 flex justify-between items-center shadow-md rounded-t-xl">
            <h2 className="text-sm font-black uppercase tracking-wider">🛒 Cupom Fiscal</h2>
            <span className="bg-white text-[#6A283A] font-black px-2 py-0.5 rounded text-xs">{carrinho.length} Itens</span>
          </div>
          
          <div className="overflow-y-auto p-2 space-y-2 bg-white min-h-[120px] max-h-[25vh] lg:max-h-none lg:flex-1">
            {carrinho.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center py-8">
                <span className="text-4xl opacity-50 mb-2">🛍️</span>
                <p className="font-medium text-sm">O carrinho está vazio</p>
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-zinc-200 shadow-sm">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-zinc-800 text-xs md:text-sm leading-tight">{item.nome}</p>
                    <p className="text-[11px] md:text-xs text-zinc-500 mt-0.5"><strong>{item.quantidade}x</strong> {formataMoeda(item.precoVenda)}</p>
                  </div>
                  <div className="flex items-center gap-3 pl-2 border-l border-zinc-100">
                    <span className="font-black text-[#6A283A] text-sm whitespace-nowrap">{formataMoeda(item.quantidade * item.precoVenda)}</span>
                    <button onClick={() => removerDoCarrinho(item.id)} className="text-red-500 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-md flex items-center justify-center font-bold text-lg transition-colors">✖</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex-shrink-0 bg-white border-t-2 border-zinc-200 p-4 lg:p-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-b-xl">
            
            <div className="grid grid-cols-2 gap-3 lg:gap-2 mb-3 lg:mb-2">
              <div>
                <label className="text-[11px] lg:text-[10px] font-bold text-zinc-500 uppercase mb-1 lg:mb-0.5 block">🏷️ Desconto (R$)</label>
                <input 
                  type="number" step="0.01" value={desconto} 
                  onChange={(e) => setDesconto(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} 
                  placeholder="0.00" 
                  className="w-full p-3 lg:p-2 rounded bg-zinc-50 font-bold border border-zinc-300 outline-none text-zinc-800 text-sm lg:text-xs shadow-inner" 
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-1 lg:mb-0.5">
                  <label className="text-[11px] lg:text-[10px] font-bold text-zinc-500 uppercase block">Vincular Cliente</label>
                  <button type="button" onClick={() => setModalCliente(true)} className="text-[9px] font-black text-white bg-[#6A283A] px-2 py-1 lg:px-1.5 lg:py-0.5 rounded uppercase shadow-sm">➕ Novo</button>
                </div>
                <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)} className="w-full p-3 lg:p-2 rounded bg-zinc-50 font-bold border border-zinc-300 outline-none text-zinc-800 text-sm lg:text-xs">
                  <option value="">👤 Consumidor Final</option>
                  {clientesDB.map(c => <option key={c.id} value={c.id}>{c.nome.substring(0, 15)}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-3 lg:mb-2">
              <label className="text-[11px] lg:text-[10px] font-bold text-zinc-500 uppercase mb-1 lg:mb-0.5 block">Forma de Pagamento</label>
              <select value={pagamento} onChange={(e) => { setPagamento(e.target.value); setValorRecebido(''); }} className="w-full p-3 lg:p-2 rounded bg-zinc-50 font-bold border border-zinc-300 outline-none text-zinc-800 text-sm lg:text-xs focus:ring-2 focus:ring-[#6A283A]">
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">💠 PIX</option>
                <option value="credito">💳 Cartão de Crédito</option>
                <option value="debito">💳 Cartão de Débito</option>
                <option value="venda_direta">📝 Venda Direta (Parcelado)</option>
                <option value="multiplo">🔀 Múltiplas Formas (Dividir)</option>
              </select>
            </div>

            {pagamento === 'venda_direta' && (
              <div className="mb-3 lg:mb-2 animate-in fade-in duration-200">
                <label className="text-[11px] lg:text-[10px] font-bold text-purple-700 uppercase mb-1 lg:mb-0.5 block">📝 Nota / Parcelas (Oculto no cupom)</label>
                <input type="text" value={observacaoDireta} onChange={(e) => setObservacaoDireta(e.target.value)} placeholder="Ex: Combinado 3x de R$ 50 no dia 10" className="w-full p-3 lg:p-2 rounded bg-purple-50 text-purple-900 border-2 border-purple-200 font-bold text-sm lg:text-xs outline-none focus:border-purple-500" />
              </div>
            )}

            {pagamento === 'dinheiro' && (
              <div className="grid grid-cols-2 gap-3 lg:gap-2 mb-3 lg:mb-2 animate-in fade-in duration-200 items-end">
                <div>
                  <label className="text-[11px] lg:text-[10px] font-bold text-zinc-500 uppercase mb-1 lg:mb-0.5 block">Recebido (R$)</label>
                  <input type="number" step="0.01" value={valorRecebido} placeholder="Ex: 100" onChange={(e) => setValorRecebido(e.target.value ? Number(e.target.value) : '')} className="w-full p-3 lg:p-2 rounded bg-white border-2 border-[#6A283A]/40 text-[#6A283A] font-black text-base lg:text-sm outline-none" />
                </div>
                {Number(valorRecebido) >= totalComDesconto && totalComDesconto > 0 && (
                  <div className="h-[44px] lg:h-[36px] px-3 lg:px-2 bg-green-100 border border-green-400 rounded-lg flex justify-between items-center shadow-inner">
                    <span className="text-[10px] lg:text-[10px] text-green-800 uppercase font-black">Troco:</span>
                    <span className="text-base lg:text-sm font-black text-green-700">{formataMoeda(Number(valorRecebido) - totalComDesconto)}</span>
                  </div>
                )}
              </div>
            )}

            {pagamento === 'multiplo' && (
              <div className="bg-zinc-50 p-3 lg:p-2 rounded-lg border border-zinc-200 mb-3 lg:mb-2 grid grid-cols-2 gap-3 lg:gap-2 animate-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="text-[10px] lg:text-[9px] font-black text-zinc-600 block mb-1">💵 Dinheiro</label>
                  <input type="number" step="0.01" value={valoresMultiplos.dinheiro} onChange={(e) => setValoresMultiplos({...valoresMultiplos, dinheiro: e.target.value})} className="w-full p-2 lg:p-1.5 rounded border border-zinc-300 font-bold text-sm lg:text-xs" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] lg:text-[9px] font-black text-zinc-600 block mb-1">💠 PIX</label>
                  <input type="number" step="0.01" value={valoresMultiplos.pix} onChange={(e) => setValoresMultiplos({...valoresMultiplos, pix: e.target.value})} className="w-full p-2 lg:p-1.5 rounded border border-zinc-300 font-bold text-sm lg:text-xs" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] lg:text-[9px] font-black text-zinc-600 block mb-1">💳 Crédito</label>
                  <input type="number" step="0.01" value={valoresMultiplos.credito} onChange={(e) => setValoresMultiplos({...valoresMultiplos, credito: e.target.value})} className="w-full p-2 lg:p-1.5 rounded border border-zinc-300 font-bold text-sm lg:text-xs" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] lg:text-[9px] font-black text-zinc-600 block mb-1">💳 Débito</label>
                  <input type="number" step="0.01" value={valoresMultiplos.debito} onChange={(e) => setValoresMultiplos({...valoresMultiplos, debito: e.target.value})} className="w-full p-2 lg:p-1.5 rounded border border-zinc-300 font-bold text-sm lg:text-xs" placeholder="0.00" />
                </div>
                
                <div className="col-span-2">
                  <label className="text-[10px] lg:text-[9px] font-black text-zinc-600 block mb-1">📝 Observação da Divisão</label>
                  <input type="text" value={observacaoMultipla} onChange={(e) => setObservacaoMultipla(e.target.value)} className="w-full p-2 lg:p-1.5 rounded border border-zinc-300 font-bold text-sm lg:text-xs bg-white focus:border-[#6A283A] outline-none" placeholder="Ex: Cartão da mãe, PIX da tia..." />
                </div>

                <div className="col-span-2 pt-2 lg:pt-1 border-t border-zinc-200 flex justify-between items-center text-xs lg:text-[10px]">
                  <span className="font-bold text-zinc-500">
                    Falta: <strong className={faltaPagarMultiplo > 0 ? "text-red-600" : "text-green-600"}>{formataMoeda(Math.max(0, faltaPagarMultiplo))}</strong>
                  </span>
                  {trocoMultiplo > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-black">Troco: {formataMoeda(trocoMultiplo)}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-stretch gap-3 lg:gap-2 mt-2">
              <div className="flex-[1.4] bg-zinc-100 border border-zinc-200 rounded-lg p-2 lg:p-1.5 flex flex-col justify-center items-center">
                <span className="text-[10px] lg:text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">A Pagar</span>
                <span className="text-2xl lg:text-xl font-black text-[#6A283A] leading-none">{formataMoeda(totalComDesconto)}</span>
                {Number(desconto) > 0 && <span className="text-[10px] lg:text-[9px] text-zinc-400 line-through mt-1 lg:mt-0.5">{formataMoeda(totalCompra)}</span>}
              </div>

              <button 
                onClick={handleFinalizarVenda} 
                disabled={botaoDesabilitado || processandoVenda} 
                className="flex-[2] bg-[#6A283A] text-white font-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#521e2d] uppercase tracking-wider text-base lg:text-sm py-4 lg:py-0 flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                {processandoVenda ? '⏳ Gravando...' : '✅ Finalizar'}
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}