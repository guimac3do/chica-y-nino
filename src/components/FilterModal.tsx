import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
  availableSizes: { id: number; size: string }[];
  availableColors: string[];
  maxPrice: number;
}

interface FilterValues {
  priceRange: [number, number] | null;
  sizes: number[];
  colors: string[];
  gender: string; // Adiciona o filtro de gênero
  date?: string;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  availableSizes,
  availableColors,
  maxPrice,
}) => {
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [gender, setGender] = useState<string>('all'); // Estado para gênero, padrão 'all'
  const [date, setDate] = useState<string>("");

  // Prevent body scrolling when filter is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleApply = () => {
    onApply({
      priceRange,
      sizes: selectedSizes,
      colors: selectedColors,
      gender, // Inclui o gênero no filtro aplicado
      date,
    });
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterValues = {
      priceRange: null,
      sizes: [],
      colors: [],
      gender: 'all', // Reseta para 'all'
      date: "",
    };
    setPriceRange(null);
    setSelectedSizes([]);
    setSelectedColors([]);
    setGender('all');
    setDate("");
    onApply(resetFilters);
  };

  const toggleSize = (sizeId: number) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId) ? prev.filter((s) => s !== sizeId) : [...prev, sizeId]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Bottom Sheet Filter */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-50 transition-transform duration-300 max-h-[90vh] overflow-auto"
      >
        <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button
            variant="ghost"
            onClick={handleReset}
            className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary text-md"
          >
            Resetar filtros
          </Button>
        </div>

        <div className="p-4 pt-6 space-y-8">
          {/* Gênero filter */}
          <div>
            <Label className="font-medium">Gênero</Label>
            <div className="flex gap-2 mt-2">
            <Button
                variant={gender === 'all' ? 'default' : 'outline'}
                className="rounded-full px-6"
                onClick={() => setGender('all')}
              >
                Todos
              </Button>
              <Button
                variant={gender === 'masculino' ? 'default' : 'outline'}
                className={`rounded-full px-6 ${gender === 'masculino' ? 'bg-blue-500 text-white hover:bg-blue-500' : 'text-blue-500 border-blue-500'}`}
                onClick={() => setGender('masculino')}
              >
                Menino
              </Button>
              <Button
                variant={gender === 'feminino' ? 'default' : 'outline'}
                className={`rounded-full px-6 ${gender === 'feminino' ? 'bg-pink-500 text-white hover:bg-pink-500' : 'text-pink-500 border-pink-500'}`}
                onClick={() => setGender('feminino')}
              >
                Menina
              </Button>
            </div>
          </div>

          {/* Preço filter */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="font-medium">Faixa de preço</Label>
              <span className="font-medium text-primary">
                {priceRange
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceRange[1])
                  : 'Sem limite'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)}
              </span>
              <Slider
                value={priceRange ? [priceRange[1]] : [maxPrice]}
                min={0}
                max={maxPrice}
                step={10}
                className="flex-1"
                onValueChange={(value) => setPriceRange([0, value[0]])}
              />
              <span className="text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxPrice)}
              </span>
            </div>
          </div>

          {/* Tamanhos filter */}
          {availableSizes.length > 0 && (
            <div>
              <div className="flex justify-between">
                <Label className="font-medium">Tamanhos</Label>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableSizes.map((size) => (
                  <div key={size.id} className="flex items-center">
                    <Checkbox
                      id={`size-${size.id}`}
                      checked={selectedSizes.includes(size.id)}
                      onCheckedChange={() => toggleSize(size.id)}
                    />
                    <label htmlFor={`size-${size.id}`} className="ml-2 text-sm">
                      {size.size}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cores filter */}
          {availableColors.length > 0 && (
            <div>
              <div className="flex justify-between">
                <Label className="font-medium">Cores</Label>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableColors.map((color) => (
                  <div key={color} className="flex items-center">
                    <Checkbox
                      id={`color-${color}`}
                      checked={selectedColors.includes(color)}
                      onCheckedChange={() => toggleColor(color)}
                    />
                    <label htmlFor={`color-${color}`} className="ml-2 text-sm capitalize">
                      {color}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        <div>
              {/* Apply button */}
              <Button
                className="w-full mt-4 bg-primary text-white"
                onClick={handleApply}
              >
                Aplicar filtros
              </Button>

              <Button
                variant={'outline'}
                className="w-full text-primary mt-2 border-primary bg-transparent"
                onClick={handleReset}
              >
                Resetar filtros
              </Button>
          </div>
          
        </div>
      </div>
    </>
  );
};