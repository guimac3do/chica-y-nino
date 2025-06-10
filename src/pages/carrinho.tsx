// pages/CartPage.tsx
import React, { useState } from 'react';
import { ProductModal } from '@/components/ProductModal';
import { Product } from '@/types/product';

interface CartPageProps {
  cart: Product[];
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
}

const CartPage: React.FC<CartPageProps> = ({ cart, setCart }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const addToCart = (product: Product) => {
    setCart([...cart, product]);
  };

  const handleCheckout = (product: Product) => {
    console.log('Checkout for product:', product);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Carrinho</h1>
      {cart.map((product) => (
        <div 
          key={product.id} 
          className="border p-4 mb-4 cursor-pointer"
          onClick={() => setSelectedProduct(product)}
        >
          <h2>{product.nome}</h2>
          <p>{new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(parseFloat(product.preco))}</p>
        </div>
      ))}

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default CartPage;