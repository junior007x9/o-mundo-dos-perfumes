'use client';

export default function BotaoExcluir() {
  return (
    <button 
      type="submit" 
      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center justify-center" 
      title="Excluir" 
      onClick={(e) => { 
        if(!window.confirm('Deseja mesmo apagar este produto?')) {
          e.preventDefault(); 
        }
      }}
    >
      🗑️
    </button>
  );
}