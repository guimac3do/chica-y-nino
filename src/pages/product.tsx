"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Product } from '@/types/product';
import { ProductView } from '@/components/ProductView';

const API_URL = "http://localhost:8002/api";

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        console.error('Erro ao buscar produto:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) return <div className="text-center">Carregando...</div>;
  if (!product) return <div className="text-center">Produto não encontrado</div>;

  return (
    <div className='pt-20'>
      <ProductView
        product={product}
        showBackButton={true}
      />
    </div>
  );
};

export default ProductDetails;