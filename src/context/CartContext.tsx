import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = "http://localhost:8002/api";

interface CartItem {
  id: number;
  product_id: number;
  nome: string;
  size: string;
  price: string;
  quantidade: number;
  cor: string | null;
  subtotal: number;
  color_image?: string | null; // Adiciona a imagem da cor
  images?: string[] | string | null; // Adiciona as imagens gerais
  product_size_id?: number; // Adicionado para armazenar product_size_id
}

interface Product {
  id: number;
  campaign: {
    id: number;
    data_inicio: string;
    data_fim: string;
  };
}

interface CartContextType {
  cart: { items: CartItem[]; total: number };
  cartItemCount: number;
  addToCart: (item: Omit<CartItem, 'id' | 'subtotal'>) => Promise<void>;
  updateCart: () => Promise<void>;
  validateCartForCheckout: () => Promise<{ isValid: boolean; inactiveItems: CartItem[] }>;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<{ items: CartItem[]; total: number }>({ items: [], total: 0 });
  const [cartItemCount, setCartItemCount] = useState<number>(0);
  const [isCartOpen, setCartOpen] = useState<boolean>(false);
  const { token, user } = useAuth();

  // Carregar carrinho do localStorage ao inicializar
  useEffect(() => {
    if (!token) {
      const localCart = localStorage.getItem('local_cart');
      if (localCart) {
        const parsedCart = JSON.parse(localCart);
        setCart(parsedCart);
        const totalItems = parsedCart.items.reduce((sum: number, item: CartItem) => sum + item.quantidade, 0);
        setCartItemCount(totalItems);
      }
    }
  }, []);

  // Sincronizar carrinho local com o backend ao autenticar
  useEffect(() => {
    if (token && user) {
      const localCart = localStorage.getItem('local_cart');
      if (localCart) {
        const parsedCart = JSON.parse(localCart);
        syncLocalCartToBackend(parsedCart.items);
      }
      updateCart();
    }
  }, [token, user]);

    const syncLocalCartToBackend = async (localItems: CartItem[]) => {
    if (!token) return;

    try {
      for (const item of localItems) {
        await axios.post(
          `${API_URL}/cart/add`,
          {
            product_id: item.product_id,
            product_size_id: item.product_size_id,
            quantidade: item.quantidade,
            cor: item.cor,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      localStorage.removeItem('local_cart');
    } catch (error) {
      console.error('Erro ao sincronizar carrinho local:', error);
    }
  };

  const addToCart = async (newItem: Omit<CartItem, 'id' | 'subtotal'>) => {
    if (!token) {
      // Adicionar ao carrinho local
      const localCart = localStorage.getItem('local_cart');
      let cartData = localCart ? JSON.parse(localCart) : { items: [], total: 0 };

      const existingItem = cartData.items.find(
        (item: CartItem) =>
          item.product_id === newItem.product_id &&
          item.product_size_id === newItem.product_size_id &&
          item.cor === newItem.cor
      );

      if (existingItem) {
        existingItem.quantidade += newItem.quantidade;
        existingItem.subtotal = parseFloat(existingItem.price) * existingItem.quantidade;
      } else {
        const itemWithId = {
          ...newItem,
          id: Date.now(), // ID temporário para carrinho local
          subtotal: parseFloat(newItem.price) * newItem.quantidade,
        };
        cartData.items.push(itemWithId);
      }

      cartData.total = cartData.items.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0);
      localStorage.setItem('local_cart', JSON.stringify(cartData));
      setCart(cartData);
      setCartItemCount(cartData.items.reduce((sum: number, item: CartItem) => sum + item.quantidade, 0));
    } else {
      // Adicionar ao carrinho no backend
      try {
        await axios.post(
          `${API_URL}/cart/add`,
          {
            product_id: newItem.product_id,
            product_size_id: newItem.product_size_id,
            quantidade: newItem.quantidade,
            cor: newItem.cor,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await updateCart();
      } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        throw error;
      }
    }
  };

  const updateCart = async () => {
    if (!token) {
      const localCart = localStorage.getItem('local_cart');
      if (localCart) {
        const parsedCart = JSON.parse(localCart);
        setCart(parsedCart);
        setCartItemCount(parsedCart.items.reduce((sum: number, item: CartItem) => sum + item.quantidade, 0));
      } else {
        setCart({ items: [], total: 0 });
        setCartItemCount(0);
      }
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cartData = response.data;

      const activeItems: CartItem[] = [];
      const itemsToRemove: CartItem[] = [];

      for (const item of cartData.items) {
        try {
          const productResponse = await axios.get(`${API_URL}/products/${item.product_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const product: Product = productResponse.data;
          const campaign = product.campaign;

          if (campaign) {
            const now = new Date();
            const startDate = new Date(campaign.data_inicio);
            const endDate = new Date(campaign.data_fim);

            if (startDate <= now && endDate >= now) {
              activeItems.push(item);
            } else {
              itemsToRemove.push(item);
            }
          } else {
            itemsToRemove.push(item);
          }
        } catch (error) {
          console.error(`Erro ao verificar produto ${item.product_id}:`, error);
          itemsToRemove.push(item);
        }
      }

      if (itemsToRemove.length > 0) {
        await Promise.all(
          itemsToRemove.map(item =>
            axios.delete(`${API_URL}/cart/remove`, {
              headers: { Authorization: `Bearer ${token}` },
              data: { item_id: item.id },
            })
          )
        );
      }

      const updatedCart = {
        items: activeItems,
        total: activeItems.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0),
      };

      setCart(updatedCart);
      const totalItems = updatedCart.items.reduce((sum: number, item: CartItem) => sum + item.quantidade, 0);
      setCartItemCount(totalItems);
    } catch (error) {
      console.error('Erro ao atualizar carrinho:', error);
      setCart({ items: [], total: 0 });
      setCartItemCount(0);
    }
  };

  const validateCartForCheckout = async (): Promise<{ isValid: boolean; inactiveItems: CartItem[] }> => {
    if (cart.items.length === 0) {
      return { isValid: false, inactiveItems: [] };
    }

    if (!token) {
      // Para carrinho local, validar apenas localmente
      const inactiveItems: CartItem[] = [];
      for (const item of cart.items) {
        try {
          const productResponse = await axios.get(`${API_URL}/products/${item.product_id}`);
          const product: Product = productResponse.data;
          const campaign = product.campaign;

          if (!campaign || 
              new Date(campaign.data_inicio) > new Date() || 
              new Date(campaign.data_fim) < new Date()) {
            inactiveItems.push(item);
          }
        } catch (error) {
          console.error(`Erro ao validar produto ${item.product_id}:`, error);
          inactiveItems.push(item);
        }
      }
      return {
        isValid: inactiveItems.length === 0,
        inactiveItems,
      };
    }

    const inactiveItems: CartItem[] = [];
    for (const item of cart.items) {
      try {
        const productResponse = await axios.get(`${API_URL}/products/${item.product_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const product: Product = productResponse.data;
        const campaign = product.campaign;

        if (!campaign || 
            new Date(campaign.data_inicio) > new Date() || 
            new Date(campaign.data_fim) < new Date()) {
          inactiveItems.push(item);
        }
      } catch (error) {
        console.error(`Erro ao validar produto ${item.product_id}:`, error);
        inactiveItems.push(item);
      }
    }

    return {
      isValid: inactiveItems.length === 0,
      inactiveItems,
    };
  };

  useEffect(() => {
    updateCart();
  }, [token]);

  return (
    <CartContext.Provider value={{ cart, cartItemCount, addToCart, updateCart, validateCartForCheckout, isCartOpen, setCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};