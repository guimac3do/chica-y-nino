import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { maskCPF, maskPhone, unmaskValue, isValidCPFLength, isValidPhoneLength } from '@/utils/formatters';

const API_URL = "http://localhost:8002/api";

const CreateUserPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newUser, setNewUser] = useState({ name: '', telefone: '', cpf: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!isValidCPFLength(newUser.cpf)) {
      toast({
        title: "Erro",
        description: "CPF deve conter 11 dígitos",
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

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/register`, {
        ...newUser,
        telefone: unmaskValue(newUser.telefone),
        cpf: unmaskValue(newUser.cpf)
      });
      setNewUser({ name: '', telefone: '', cpf: '' });
      toast({
        title: "Sucesso",
        description: `Cliente "${response.data.user.name}" criado com sucesso!`,
      });
      navigate('/admin/clientes'); // Opcional: redireciona após sucesso
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Adicionar Novo Cliente</h1>
      <div className="space-y-6">
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
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/clientes')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateUser} 
            disabled={isLoading}
          >
            {isLoading ? 'Criando...' : 'Criar Cliente'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;