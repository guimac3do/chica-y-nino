import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast'; // Import do useToast

interface UserDetails {
  id: number;
  name: string;
  telefone: string;
  cpf: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface Order {
  id: number;
  created_at: string;
  observacoes: string;
  total: number;
  products: Array<{
    id: number;
    nome: string;
    quantidade: number;
    preco: number;
    status_pagamento: string;
    status_estoque: string;
  }>;
}

const API_URL = "http://localhost:8002/api";

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const formatCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return cpf;
};

const UserDetailsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast(); // Hook do toast
  const [user, setUser] = useState<UserDetails | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [editUser, setEditUser] = useState<UserDetails | null>(null);
  const [editForm, setEditForm] = useState({ name: '', telefone: '', cpf: '' });

  useEffect(() => {
    fetchUserDetails();
    fetchUserOrders();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`);
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchUserOrders = async () => {
    try {
      let url = `${API_URL}/users/${userId}/pedidos?`;
      if (dateFrom) url += `&date_from=${format(dateFrom, 'yyyy-MM-dd')}`;
      if (dateTo) url += `&date_to=${format(dateTo, 'yyyy-MM-dd')}`;
      if (minValue) url += `&min_value=${minValue}`;
      if (maxValue) url += `&max_value=${maxValue}`;

      const response = await fetch(url);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching user orders:', error);
    }
  };

  const handleOrderClick = (orderId: number) => {
    navigate(`/admin/pedidos/${orderId}`);
  };

  const openEditModal = () => {
    if (!user) return;
    setEditUser(user);
    setEditForm({
      name: user.name,
      telefone: user.telefone || '',
      cpf: user.cpf || ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editUser || !userId) return;

    try {
      const response = await axios.put(`${API_URL}/users/${userId}`, editForm);
      setUser({ ...user, ...editForm });
      setEditUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      }); // Exibe o toast de sucesso
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {user && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhes do Usuário</CardTitle>
            <Button onClick={openEditModal}>Editar</Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold">Nome</h3>
              <p>{user.name}</p>
            </div>
            <div>
              <h3 className="font-semibold">Telefone</h3>
              <p>{user.telefone ? formatPhone(user.telefone) : 'Não informado'}</p>
            </div>
            <div>
              <h3 className="font-semibold">CPF</h3>
              <p>{user.cpf ? formatCPF(user.cpf) : 'Não informado'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Data de Cadastro</h3>
              <p>{format(new Date(user.created_at), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <h3 className="font-semibold">Total de Pedidos</h3>
              <p>{user.total_orders}</p>
            </div>
            <div>
              <h3 className="font-semibold">Valor Total Gasto</h3>
              <p>R$ {user.total_spent}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Data Inicial</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Data Final</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Valor Mínimo</p>
            <Input
              type="number"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="R$ 0,00"
              className="w-48"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Valor Máximo</p>
            <Input
              type="number"
              value={maxValue}
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="R$ 0,00"
              className="w-48"
            />
          </div>

          <Button className="mt-8" onClick={fetchUserOrders}>
            Aplicar Filtros
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos do Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID do Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Qtd. Produtos</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    R$ {order.total}
                  </TableCell>
                  <TableCell>
                    {order.products.reduce((acc, product) => acc + product.quantidade, 0)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {order.observacoes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CPF</label>
              <Input
                value={editForm.cpf}
                onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
};

export default UserDetailsPage;