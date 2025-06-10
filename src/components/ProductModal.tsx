// components/ProductModal.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Product } from '@/types/product';
import { ProductView } from './ProductView';
import { Button } from '@/components/ui/button';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, sizeId: number, quantidade: number, selectedColor: string | null) => void;
  onCheckout: (product: Product, sizeId: number, quantidade: number, selectedColor: string | null) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onCheckout,
}) => {
  if (!product || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[98vh] overflow-y-auto p-0 border-0">
        <DialogHeader className="sticky top-0 z-10 pb-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-[6px] right-2 rounded-full h-10"
              onClick={onClose}
              aria-label="Fechar modal"
            >
              <X className="w-6 h-6" />Voltar 
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="mt-4">
          <ProductView
            product={product}
            onClose={onClose}
            onAddToCart={onAddToCart}
            onCheckout={onCheckout}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};