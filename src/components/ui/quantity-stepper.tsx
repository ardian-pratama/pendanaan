"use client";

import { useState } from "react";

interface QuantityStepperProps {
  initialValue?: number;
  min?: number;
}

export function QuantityStepper({ initialValue = 1, min = 1 }: QuantityStepperProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="inline-flex items-center bg-surface-container rounded-full p-1">
      <button
        onClick={() => setCount((v) => Math.max(min, v - 1))}
        className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-sm shadow-sm hover:bg-surface-container-high transition-colors"
        aria-label="Kurangi jumlah"
      >
        -
      </button>
      <span className="px-2 font-label-sm text-label-sm text-on-surface font-bold w-6 text-center">
        {count}
      </span>
      <button
        onClick={() => setCount((v) => v + 1)}
        className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-sm shadow-sm hover:bg-surface-container-high transition-colors"
        aria-label="Tambah jumlah"
      >
        +
      </button>
    </div>
  );
}
