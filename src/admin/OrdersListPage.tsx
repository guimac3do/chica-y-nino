import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Types
interface Order {
  id: number;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  data_pedido: string;
  quantidade_produtos: number;
  total: string;
  campaign_id: number | null;
  campaign_name: string;
  campaign_start: string;
  campaign_end: string;
  status_pagamento: string;
}

interface Campaign {
  id: number;
  nome: string;
}

const API_URL = "http://localhost:8002/api";

// Funções de formatação
const formatCPF = (cpf: string): string => {
  if (!cpf || cpf === 'Não informado') return cpf;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatTelefone = (telefone: string): string => {
  if (!telefone || telefone === 'Não informado') return telefone;
  const cleaned = telefone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
};

const OrdersListPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("todas");
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchId, setSearchId] = useState<string>('');
  const [campaignSearch, setCampaignSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (selectedCampaignId !== 'todas') params.append('campaign_id', selectedCampaignId);

        const [ordersResponse, campaignsResponse] = await Promise.all([
          fetch(`${API_URL}/orders?${params.toString()}`),
          fetch(`${API_URL}/campaigns`)
        ]);
        

        const ordersData = await ordersResponse.json();
        const campaignsData = await campaignsResponse.json();
        console.log("Dados: ", ordersData)

        setOrders(ordersData);
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedCampaignId]);

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.nome.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-500';
      case 'pendente':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCampaignId('todas');
    setSearchId('');
    setCampaignSearch('');
    setCurrentPage(1);
  };

  const filteredOrders = orders.filter(order => 
    searchId ? order.id.toString().includes(searchId) : true
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Card className="w-full max-w-7xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Lista de Pedidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="w-64">
            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por campanha" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Buscar campanha..."
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    className="mb-2"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="todas">Todas as campanhas</SelectItem>
                  {filteredCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.nome}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 mb-1">Data Início do Pedido</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 mb-1">Data Fim do Pedido</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-48"
              />
            </div>
          </div>

          <Input
            type="text"
            placeholder="Buscar por ID do pedido"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-48"
          />

          <Button variant="outline" onClick={resetFilters}>
            Resetar Filtros
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data do Pedido</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Início Campanha</TableHead>
                <TableHead>Fim Campanha</TableHead>
                <TableHead className="text-right">Qtd. Produtos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : currentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                currentOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/admin/pedidos/${order.id}`)}
                  >
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{order.cliente_nome}</TableCell>
                    <TableCell>{formatCPF(order.cliente_cpf)}</TableCell>
                    <TableCell>{formatTelefone(order.cliente_telefone)}</TableCell>
                    <TableCell>
                      {format(new Date(order.data_pedido), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{order.campaign_name}</TableCell>
                    <TableCell>
                      {order.campaign_start ? format(new Date(order.campaign_start), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {order.campaign_end ? format(new Date(order.campaign_end), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.quantidade_produtos}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {order.total}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(order.status_pagamento)}>
                        {order.status_pagamento}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrders.length)} de {filteredOrders.length} pedidos
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersListPage;