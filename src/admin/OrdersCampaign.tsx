import React from 'react';
import { useParams, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import useSWR from 'swr';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const API_URL = "http://localhost:8002/api";

const fetcher = (url: string) => axios.get(url).then(res => res.data);

const CampaignOrdersPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: orders, error } = useSWR(`${API_URL}/campanha/${id}/pedidos`, fetcher, {
    refreshInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos automaticamente
  });

  if (error) return <div>Erro ao carregar os pedidos.</div>;
  if (!orders)  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
      <div className="h-6 bg-gray-300 rounded w-full mb-2"></div>
      <div className="h-6 bg-gray-300 rounded w-full mb-2"></div>
      <div className="h-6 bg-gray-300 rounded w-full"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Pedidos da Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <button onClick={() => navigate(-1)} className="mb-4 p-2 bg-blue-500 text-white rounded">
            Voltar
          </button>
          {orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data do Pedido</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/pedidos/${order.id}`)}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(parseFloat(order.total))}
                    </TableCell>
                    <TableCell>{order.cliente_nome}</TableCell>
                    <TableCell>{order.cliente_telefone}</TableCell>
                    <TableCell>{format(parseISO(order.data_pedido), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{order.quantidade_produtos}</TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/pedidos/${order.id}`); }} className="p-2 bg-green-500 text-white rounded">
                        Ver Detalhes
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>Nenhum pedido encontrado para esta campanha.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignOrdersPage;
