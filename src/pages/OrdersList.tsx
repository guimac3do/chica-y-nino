"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ChevronDown } from "lucide-react";

const API_URL = "http://localhost:8002/api";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantidade: number;
  cor: string | null;
  status_pagamento: string;
}

interface Order {
  id: number;
  created_at: string;
  total: number;
  total_quantidade: number; // Nova propriedade adicionada
  status_pagamento: string;
  items: OrderItem[];
}

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/orders-user-list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error.response?.data || error.message);
        toast({
          title: "Erro",
          description: "Falha ao carregar pedidos: " + (error.response?.data?.message || error.message),
          variant: "destructive",
        });
        if (error.response?.status === 401) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate, toast, isAuthenticated, token]);

  const isOrderCancelled = (order: Order) => {
    return order.items.every(item => item.status_pagamento === 'cancelado');
  };

  const getOrderStatus = (order: Order) => {
    if (isOrderCancelled(order)) return "Cancelado";
    return order.status_pagamento === "paid" ? "Pago" : "Pendente";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleRowClick = (orderId: number) => {
    navigate(`/pedido/${orderId}`);
  };

  if (loading) return <div className="text-center py-8">Carregando...</div>;

  return (
    <div className="sm:pt-[150px] pt-[100px]">
      {!isAuthenticated && <AuthModal isOpen={!isAuthenticated} onClose={() => navigate('/')} />}
      {isAuthenticated && (
        <>
          <h1 className="text-2xl font-bold mb-6">Meus Pedidos</h1>
          {orders.length === 0 ? (
            <p className="text-center p-4 bg-white rounded-md border">Nenhum pedido encontrado.</p>
          ) : (
            <div className="w-full bg-white rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-medium text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          Data <ChevronDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="font-medium text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          Total <ChevronDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="font-medium text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          Quantidade <ChevronDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="font-medium text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          Status pedido <ChevronDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const orderStatus = getOrderStatus(order);
                      
                      return (
                        <TableRow 
                          key={order.id} 
                          className={selectedRows.includes(order.id) ? "bg-gray-50" : ""}
                          onClick={() => handleRowClick(order.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell className="text-sm text-gray-500 py-8">{formatDate(order.created_at)}</TableCell>
                          <TableCell className="text-sm text-gray-900">{formatCurrency(order.total)}</TableCell>
                          <TableCell className="text-sm text-gray-900">{order.total_quantidade} unidades</TableCell>
                          <TableCell>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                orderStatus === "Cancelado"
                                  ? "bg-red-100 text-red-700"
                                  : orderStatus === "Pago" 
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {orderStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrdersList;