// app/dashboard/produtos/InputMoeda.tsx
'use client';

import { useState } from 'react';

export default function InputMoeda({ name, defaultValue, className, placeholder, required }: any) {
  // Inicializa o valor formatando o que vier do banco de dados (ex: 1500.5 -> 1.500,50)
  const formatar = (val: string) => {
    const numStr = val.replace(/\D/g, ''); // Remove tudo que não é número
    if (numStr === '') return '';
    const num = Number(numStr) / 100; // Divide por 100 para criar as casas decimais
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const initVal = (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') 
    ? formatar(Number(defaultValue).toFixed(2).replace(/\D/g, '')) 
    : '';

  const [valor, setValor] = useState(initVal);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(formatar(e.target.value));
  };

  return (
    <input
      type="text"
      name={name}
      value={valor}
      onChange={handleChange}
      required={required}
      className={className}
      placeholder={placeholder || '0,00'}
    />
  );
}