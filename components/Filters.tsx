'use client';

import { ChangeEvent } from 'react';

export function Filters({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative w-full">
        <input
          value={value}
          onChange={handleChange}
          placeholder={placeholder ?? 'Search managers or teams'}
          className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm text-gray-100 shadow-inner outline-none focus:border-brand-400 focus:bg-gray-900"
        />
      </div>
    </div>
  );
}
