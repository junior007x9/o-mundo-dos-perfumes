// app/dashboard/tutoriais/page.tsx
'use client';

export default function TutoriaisPage() {

  // 🚀 LISTA DE TUTORIAIS - Para mudar os vídeos, basta trocar o link no "urlVideo"!
  const tutoriaisBase = [
    {
      id: 1,
      icone: "🛒",
      titulo: "Como realizar Vendas Básicas (Dinheiro, PIX, Cartão)",
      descricao: "Aprenda a pesquisar produtos, aplicar descontos, vincular clientes e finalizar vendas comuns no caixa.",
      urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ", // 🔴 TROQUE ESTE LINK PELO SEU VÍDEO DO YOUTUBE
      categoria: "pdv"
    },
    {
      id: 2,
      icone: "📝",
      titulo: "Como funciona a Venda Direta (Carnê / Fiado)",
      descricao: "Passo a passo de como parcelar uma venda, escolher datas de vencimento e cobrar os clientes no WhatsApp.",
      urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ", // 🔴 TROQUE ESTE LINK
      categoria: "pdv"
    },
    {
      id: 3,
      icone: "📦",
      titulo: "Cadastrando Produtos e Lendo Código de Barras",
      descricao: "Veja como adicionar novos perfumes, usar a câmera do celular para código de barras e montar kits promocionais.",
      urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ", // 🔴 TROQUE ESTE LINK
      categoria: "estoque"
    },
    {
      id: 4,
      icone: "🔐",
      titulo: "Abertura e Fechamento de Caixa",
      descricao: "Como declarar o saldo inicial, conferir o resumo do turno e bater os valores no fechamento.",
      urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ", // 🔴 TROQUE ESTE LINK
      categoria: "pdv"
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 md:p-8 rounded-2xl shadow-lg border border-blue-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-white/20 p-4 rounded-full shadow-inner backdrop-blur-sm border-2 border-white/30 text-4xl">
            🎓
          </div>
          <div>
            <h1 className="font-black text-2xl md:text-3xl uppercase tracking-wider">Universidade O Mundo dos Perfumes</h1>
            <p className="text-blue-100 text-sm md:text-base mt-1 font-medium max-w-xl">
              Assista aos treinamentos abaixo para dominar o sistema, evitar erros no estoque e agilizar o seu dia a dia no balcão de vendas.
            </p>
          </div>
        </div>
      </div>

      {/* DICA DE SUPORTE */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex gap-4 shadow-sm items-start">
        <span className="text-2xl mt-0.5">💡</span>
        <div>
          <h3 className="font-bold text-amber-900">Precisa de ajuda com algo que não está aqui?</h3>
          <p className="text-amber-800 text-sm mt-0.5">Contacte o administrador do sistema para reportar dificuldades ou solicitar novos vídeos tutoriais.</p>
        </div>
      </div>

      {/* GRID DE VÍDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {tutoriaisBase.map((tutorial) => (
          <div key={tutorial.id} className="bg-white rounded-2xl shadow-md border border-[#E0DDDD] overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
            
            {/* ÁREA DO VÍDEO (IFRAME) */}
            <div className="w-full aspect-video bg-zinc-900 relative">
              <iframe 
                src={tutorial.urlVideo} 
                title={tutorial.titulo}
                className="w-full h-full absolute top-0 left-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>

            {/* DESCRIÇÃO DO VÍDEO */}
            <div className="p-5 md:p-6 flex-1 flex flex-col">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl leading-none">{tutorial.icone}</span>
                <h2 className="text-lg font-black text-[#6A283A] leading-tight">
                  {tutorial.titulo}
                </h2>
              </div>
              <p className="text-zinc-500 text-sm font-medium mt-2 pl-9 leading-relaxed">
                {tutorial.descricao}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-10 opacity-60">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">O Mundo dos Perfumes - Treinamento Oficial</p>
      </div>

    </div>
  );
}