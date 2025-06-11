import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

const API_URL = "http://localhost:8002/api";

interface User {
  id: number;
  name: string;
  telefone: string;
  cpf: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (credential: string, onSuccess?: () => void) => Promise<void>;
  register: (name: string, telefone: string, cpf: string, onSuccess?: () => void) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data);
        } catch (error) {
          console.error('Erro ao buscar usuário:', error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (credential: string, onSuccess?: () => void) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { credential });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      const message = error.response?.data?.message || 'Falha ao fazer login. Verifique suas credenciais.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (name: string, telefone: string, cpf: string, onSuccess?: () => void) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, telefone, cpf });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      toast({
        title: "Sucesso",
        description: "Cadastro realizado com sucesso!",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      const errors = error.response?.data?.errors || {};
      let message = 'Falha ao registrar. Verifique os dados informados.';
      if (errors.telefone) {
        message = errors.telefone[0];
      } else if (errors.cpf) {
        message = errors.cpf[0];
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    toast({
      title: "Sucesso",
      description: "Logout realizado com sucesso!",
    });
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {loading ? <div>Carregando...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};