import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { 
  Filter,
  Users,
  CreditCard,
  ShoppingBag,
  X,
  LineChart,
  MoreVertical,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { maskCPF, maskPhone, unmaskValue, isValidCPFLength, isValidPhoneLength } from '@/utils/formatters';

interface User {
  id: number;
  name: string;
  telefone: string;
  cpf: string | null;
  total_orders: number;
  total_spent: number;
}

interface Filters {
  minOrders: number;
  maxOrders: number;
  minSpent: number;
  maxSpent: number;
}

interface Pagination {
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
}

const ITEMS_PER_PAGE = 10;
const API_URL = "http://localhost:8002/api";

const formatPhone = (phone: string) => {
  return maskPhone(phone);
};

const formatCPF = (cpf: string) => {
  return maskCPF(cpf);
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    total: 0,
    per_page: ITEMS_PER_PAGE,
    last_page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minOrders: 0,
    maxOrders: 100,
    minSpent: 0,
    maxSpent: 10000,
  });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', cpf: '', telefone: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', telefone: '', cpf: '' });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', currentPage.toString());
      params.append('per_page', ITEMS_PER_PAGE.toString());

      const response = await axios.get(`${API_URL}/users?${params.toString()}`);
      const { data, current_page, total, per_page, last_page } = response.data;

      setUsers(data);
      setFilteredUsers(data);
      setPagination({
        current_page,
        total,
        per_page,
        last_page,
      });

      const maxOrders = Math.max(...data.map((user: User) => user.total_orders), 100);
      const maxSpent = Math.max(...data.map((user: User) => user.total_spent), 10000);
      
      setFilters(prev => ({
        ...prev,
        maxOrders: Math.ceil(maxOrders),
        maxSpent: Math.ceil(maxSpent)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setFilteredUsers([]);
      setPagination({ current_page: 1, total: 0, per_page: ITEMS_PER_PAGE, last_page: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    let filtered = users;

    filtered = filtered.filter(user => 
      user.total_orders >= filters.minOrders && 
      user.total_orders <= filters.maxOrders
    );

    filtered = filtered.filter(user => 
      user.total_spent >= filters.minSpent && 
      user.total_spent <= filters.maxSpent
    );

    setFilteredUsers(filtered);
  }, [filters, users]);

  const resetFilters = () => {
    setFilters({
      minOrders: 0,
      maxOrders: Math.max(...users.map(user => user.total_orders), 100),
      minSpent: 0,
      maxSpent: Math.max(...users.map(user => user.total_spent), 10000),
    });
    setSearch("");
  };

  const totalPages = pagination.last_page;
  const currentUsers = filteredUsers; // Removido o slice, pois o backend já pagina

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const totalSpent = filteredUsers.reduce((sum, user) => sum + user.total_spent, 0);
  const totalOrders = filteredUsers.reduce((sum, user) => sum + user.total_orders, 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  const handleOrderClick = (id: number) => {
    navigate(`/admin/clientes/${id}`);
  };

  const openEditModal = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setEditUser(user);
    setEditForm({
      name: user.name,
      cpf: user.cpf ? maskCPF(user.cpf) : '',
      telefone: user.telefone ? maskPhone(user.telefone) : ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editUser) return;
    if (!isValidCPFLength(editForm.cpf)) {
      toast({
        title: "Erro",
        description: "CPF deve conter 11 dígitos",
        variant: "destructive",
      });
      return;
    }
    if (!isValidPhoneLength(editForm.telefone)) {
      toast({
        title: "Erro",
        description: "Telefone deve conter 10 ou 11 dígitos",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/users/${editUser.id}`, {
        ...editForm,
        telefone: unmaskValue(editForm.telefone),
        cpf: unmaskValue(editForm.cpf)
      });
      setUsers(users.map(u => u.id === editUser.id ? { ...u, ...response.data.user } : u));
      setFilteredUsers(filteredUsers.map(u => u.id === editUser.id ? { ...u, ...response.data.user } : u));
      setEditUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!isValidCPFLength(newUser.cpf)) {
      toast({
        title: "Erro",
        description: "CPF deve conter exatamente 11 dígitos",
        variant: "destructive",
      });
      return;
    }
    if (!isValidPhoneLength(newUser.telefone)) {
      toast({
        title: "Erro",
        description: "Telefone deve conter 10 ou 11 dígitos",
        variant: "destructive",
      });
      return;
    }
  
    const unmaskedTelefone = unmaskValue(newUser.telefone);
    console.log('Telefone enviado:', unmaskedTelefone); // Log para depuração
  
    try {
      const response = await axios.post(`${API_URL}/register`, {
        ...newUser,
        telefone: unmaskedTelefone,
        cpf: unmaskValue(newUser.cpf)
      });
      setCreateModalOpen(false);
      setNewUser({ name: '', telefone: '', cpf: '' });
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso!",
      });
      fetchUsers(); // Atualiza a lista após criar
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const errors = error.response.data.errors;
        if (errors.telefone) {
          toast({
            title: "Erro",
            description: "Já existe um usuário com esse telefone.",
            variant: "destructive",
          });
        } else if (errors.cpf) {
          toast({
            title: "Erro",
            description: "Já existe um usuário com esse CPF.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: "Erro ao validar os dados.",
            variant: "destructive",
          });
        }
      } else {
        console.error('Error creating user:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar cliente.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Customer Management</h1>
            <p className="text-sm text-gray-500">View and manage customer information</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Cliente
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Customers</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{pagination.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-500">
                <LineChart className="h-4 w-4 mr-1" />
                Active Customers
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Orders</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{totalOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Combined customer orders
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Order Value</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(averageOrderValue)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Per customer average
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Registered Customers - <Badge>{pagination.total} customers</Badge></CardTitle>
              <p className="text-sm text-gray-500 mt-1">Manage and view customer details</p>
            </div>
            <div className="flex items-center gap-3">
              <Input 
                placeholder="Search by name or phone..." 
                className="w-[280px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="font-medium">Filters</div>
                    
                    <div>
                      <label className="text-sm font-medium">Orders Range</label>
                      <div className="mt-2">
                        <Slider
                          min={0}
                          max={filters.maxOrders}
                          step={1}
                          value={[filters.minOrders, filters.maxOrders]}
                          onValueChange={([min, max]) => 
                            setFilters(prev => ({ ...prev, minOrders: min, maxOrders: max }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-sm text-gray-500">
                          <span>{filters.minOrders}</span>
                          <span>{filters.maxOrders}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Total Spent Range</label>
                      <div className="mt-2">
                        <Slider
                          min={0}
                          max={filters.maxSpent}
                          step={100}
                          value={[filters.minSpent, filters.maxSpent]}
                          onValueChange={([min, max]) => 
                            setFilters(prev => ({ ...prev, minSpent: min, maxSpent: max }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-sm text-gray-500">
                          <span>R$ {filters.minSpent}</span>
                          <span>R$ {filters.maxSpent}</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={resetFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Details</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : currentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">No customers found</TableCell>
                    </TableRow>
                  ) : (
                    currentUsers.map((user) => (
                      <TableRow onClick={() => handleOrderClick(user.id)} key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.cpf ? formatCPF(user.cpf) : 'Não informado'}</TableCell>
                        <TableCell>{user.telefone ? formatPhone(user.telefone) : 'Não informado'}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="rounded-full">
                            {user.total_orders}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(user.total_spent)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => openEditModal(e, user)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {currentUsers.length} of {pagination.total} customers
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    {"<"}
                  </Button>
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "ghost"}
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {">"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={newUser.telefone}
                  onChange={(e) => setNewUser({ ...newUser, telefone: maskPhone(e.target.value) })}
                  placeholder="(xx) xxxxx-xxxx"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CPF</label>
                <Input
                  value={newUser.cpf}
                  onChange={(e) => setNewUser({ ...newUser, cpf: maskCPF(e.target.value) })}
                  placeholder="xxx.xxx.xxx-xx"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <label className="text-sm font-medium">CPF</label>
                <Input
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({ ...editForm, cpf: maskCPF(e.target.value) })}
                  placeholder="xxx.xxx.xxx-xx"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: maskPhone(e.target.value) })}
                  placeholder="(xx) xxxxx-xxxx"
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
    </div>
  );
};

export default UsersPage;