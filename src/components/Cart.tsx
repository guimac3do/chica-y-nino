"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, Lock, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

const STORAGE_URL = "http://localhost:8002";
const API_URL = "http://localhost:8002/api";

interface CartProps {
  onClose: () => void;
}

interface Product {
  id: number;
  images: string[] | string | null;
  thumbnails: string[] | string | null;
  campaign: {
    id: number;
    data_inicio: string;
    data_fim: string;
  };
}

interface CartItem {
  id: number;
  product_id: number;
  nome: string;
  size: string;
  price: string;
  quantidade: number;
  cor: string | null;
  subtotal: number;
  color_image?: string | null;
  images?: string[] | string | null;
  product_size_id?: number;
}

export const Cart: React.FC<CartProps> = ({ onClose }) => {
  const { cart, updateCart, validateCartForCheckout } = useCart();
  const { toast } = useToast();
  const { token } = useAuth();
  const [products, setProducts] = useState<{ [key: number]: Product }>({});
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductImages = async () => {
      const productIds = cart.items.map(item => item.product_id);
      const uniqueIds = [...new Set(productIds)];

      const fetchedProducts: { [key: number]: Product } = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const response = await axios.get(`${API_URL}/products/${id}`);
            fetchedProducts[id] = response.data;
          } catch (error) {
            console.error(`Erro ao buscar produto ${id}:`, error);
          }
        })
      );
      setProducts(fetchedProducts);
    };

    if (cart.items.length > 0) {
      fetchProductImages();
    }
  }, [cart.items]);

  const getFirstImage = (images: string[] | string | null, thumbnails: string[] | string | null): string | undefined => {
    if (thumbnails) {
      if (Array.isArray(thumbnails)) return thumbnails[0];
      try {
        const parsed = JSON.parse(thumbnails);
        return Array.isArray(parsed) ? parsed[0] : thumbnails;
      } catch {
        return thumbnails;
      }
    }
    if (!images) return undefined;
    if (Array.isArray(images)) return images[0];
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed[0] : images;
    } catch {
      return images;
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!token) {
      const localCart = localStorage.getItem('local_cart');
      if (localCart) {
        let cartData = JSON.parse(localCart);
        cartData.items = cartData.items.filter((item: CartItem) => item.id !== itemId);
        cartData.total = cartData.items.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0);
        localStorage.setItem('local_cart', JSON.stringify(cartData));
        updateCart();
        toast({
          title: "Sucesso",
          description: "Item removido do carrinho!",
        });
      }
      return;
    }

    try {
      await axios.delete(`${API_URL}/cart/remove`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { item_id: itemId },
      });
      await updateCart();
      toast({
        title: "Sucesso",
        description: "Item removido do carrinho!",
      });
    } catch (error) {
      console.error('Erro ao remover item do carrinho:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover item: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    if (!token) {
      const localCart = localStorage.getItem('local_cart');
      if (localCart) {
        let cartData = JSON.parse(localCart);
        const item = cartData.items.find((item: CartItem) => item.id === itemId);
        if (item) {
          item.quantidade = newQuantity;
          item.subtotal = parseFloat(item.price) * newQuantity;
          cartData.total = cartData.items.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0);
          localStorage.setItem('local_cart', JSON.stringify(cartData));
          updateCart();
        }
      }
      return;
    }

    try {
      await axios.put(
        `${API_URL}/cart/update`,
        {
          item_id: itemId,
          quantidade: newQuantity,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await updateCart();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar quantidade: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const removeInactiveItems = async (inactiveItems: CartItem[]) => {
    try {
      for (const item of inactiveItems) {
        if (!token) {
          const localCart = localStorage.getItem('local_cart');
          if (localCart) {
            let cartData = JSON.parse(localCart);
            cartData.items = cartData.items.filter((i: CartItem) => i.id !== item.id);
            cartData.total = cartData.items.reduce((sum: number, i: CartItem) => sum + i.subtotal, 0);
            localStorage.setItem('local_cart', JSON.stringify(cartData));
          }
        } else {
          await axios.delete(`${API_URL}/cart/remove`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { item_id: item.id },
          });
        }
      }
      await updateCart();
      toast({
        title: "Aviso",
        description: `Foram removidos ${inactiveItems.length} item(s) do carrinho pois suas campanhas não estão mais ativas.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Erro ao remover itens inativos:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover itens inativos: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Erro",
        description: "O carrinho está vazio.",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      setAuthModalOpen(true);
      setPendingCheckout(true);
      return;
    }

    const { isValid, inactiveItems } = await validateCartForCheckout();
    if (!isValid) {
      toast({
        title: "Erro",
        description: "Alguns itens no carrinho pertencem a campanhas que não estão mais ativas. Eles serão removidos.",
        variant: "destructive",
      });
      await removeInactiveItems(inactiveItems);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/orders`,
        {
          items: cart.items.map(item => ({
            product_id: item.product_id,
            product_size_id: item.product_size_id,
            quantidade: item.quantidade,
            cor: item.cor || null,
          })),
          observacoes: "Entrega rápida",
          telefone: "123456789",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast({
        title: "Sucesso",
        description: `Pedido #${response.data.order_id} criado com sucesso!`,
        duration: 3000,
      });
      await axios.delete(`${API_URL}/cart/clear`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await updateCart();
      onClose();
      navigate(`/pedido/${response.data.order_id}`);
    } catch (error) {
      console.error('Erro completo:', error.response?.data || error.message);
      toast({
        title: "Erro",
        description: "Falha ao finalizar o pedido: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const getCartItemImage = (item: CartItem, product?: Product): string | undefined => {
    if (item.color_image) {
      return item.color_image;
    }
    if (product) {
      return getFirstImage(product.images, product.thumbnails);
    }
    return undefined;
  };

  const handleClearCart = async () => {
    if (!token) {
      localStorage.removeItem('local_cart');
      updateCart();
      toast({
        title: "Sucesso",
        description: "Carrinho limpo com sucesso!",
      });
      return;
    }

    try {
      await axios.delete(`${API_URL}/cart/clear`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await updateCart();
      toast({
        title: "Sucesso",
        description: "Carrinho limpo com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      toast({
        title: "Erro",
        description: "Falha ao limpar o carrinho: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleContinueShopping = () => {
    onClose();
    navigate('/');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);
    if (pendingCheckout) {
      await handleCheckout();
      setPendingCheckout(false);
    }
  };

  return (
    <div className="sidebar-cart open h-full flex flex-col bg-white shadow-lg">
      <div className="title p-4 border-b flex items-center justify-between">
        <h3 className="h3 text-lg font-bold">
          <b>Meu carrinho</b> (<span className="sidebar-cart__items-count">{cart.items.length}</span>)
        </h3>
        {cart.items.length > 0 && (
          <button 
            type="button" 
            aria-label="Limpar carrinho" 
            title="Limpar carrinho" 
            className="sidebar-cart__clear-btn text-sm text-gray-500"
            onClick={handleClearCart}
          >
            Limpar carrinho
          </button>
        )}
        <div className="close open cursor-pointer" onClick={onClose}>
          <X className="w-6 h-6" />
        </div>
      </div>

      <div className="content flex-1 flex flex-col">
        {cart.items.length === 0 ? (
          <div className="empty flex flex-col items-center justify-center p-10 h-full">
            <div className="circle bg-gray-100 rounded-full p-6 mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-500" />
            </div>
            <div className="info text-center mb-6">
              <span className="block mb-4">Poxa, seu carrinho está vazio <small>😔</small></span>
              <button 
                className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300"
                onClick={handleContinueShopping}
              >
                Continuar comprando
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="cart-items flex-1 overflow-y-auto p-4">
              <ul className="cart__page-items-default space-y-4">
                {cart.items.map((item) => {
                  const product = products[item.product_id];
                  const imageSrc = getCartItemImage(item, product);
                  const oldPrice = parseFloat(item.price) * 1.3;

                  return (
                    <li key={item.id} data-product-id={item.product_id} className="item flex border-b pb-4">
                      <div className="thumb w-20 h-20 mr-3">
                        <Link to={`/produto/${item.product_id}`}>
                          {imageSrc ? (
                            <img
                              src={`${STORAGE_URL}/api/storage/app/public/${imageSrc}`}
                              alt={item.nome}
                              className="product w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs">
                              Sem imagem
                            </div>
                          )}
                        </Link>
                      </div>
                      <div className="content flex-1 relative pl-1">
                        <Trash2 
                          className="fe-trash-2 absolute right-0 top-0 w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500"
                          onClick={() => handleRemoveItem(item.id)}
                        />
                        <Link to={`/produto/${item.product_id}`}>
                          <h4 className="text-sm font-medium mb-1 pr-6">{item.nome}</h4>
                        </Link>
                        <p className="options text-xs text-gray-600 mb-1">
                          Tamanho: <span className='uppercase'>{item.size}</span> <span className='block'>{item.cor && `Cor: ${item.cor}`}</span>
                        </p>
                        <p className="price mb-2">
                          <span className="old-price text-xs line-through text-gray-500 mr-2">
                            {formatCurrency(oldPrice)}
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(parseFloat(item.price))}
                          </span>
                        </p>
                        <div className="qty flex items-center">
                          <Minus 
                            className="fe-minus w-4 h-4 cursor-pointer text-gray-600"
                            onClick={() => handleUpdateQuantity(item.id, item.quantidade - 1)}
                          />
                          <span className="n-qty mx-2 text-sm">{item.quantidade}</span>
                          <Plus 
                            className="fe-plus w-4 h-4 cursor-pointer text-gray-600"
                            onClick={() => handleUpdateQuantity(item.id, item.quantidade + 1)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="cart-totals p-4 border-t">
              <table className="w-full mb-4">
                <tbody>
                  <tr className="total h-12">
                    <td className="text-sm font-bold">Total</td>
                    <td align="right" className="total d-flex-center-end">
                      <span className="font-bold">{formatCurrency(cart.total)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="checkout-btn-wrapper">
                <Button
                  className="w-full bg-primary text-white py-3 text-base font-bold flex items-center justify-center gap-2"
                  onClick={handleCheckout}
                >
                  <Lock className="w-4 h-4" />
                  Finalizar Pedido
                </Button>
                <button 
                  className="block w-full text-center mt-2 text-sm text-primary hover:underline"
                  onClick={handleContinueShopping}
                >
                  Continuar comprando
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingCheckout(false);
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};