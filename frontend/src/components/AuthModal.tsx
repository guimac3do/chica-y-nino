import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [credential, setCredential] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const { login, register } = useAuth();
  const { toast } = useToast();

  const formatTelefone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCpf = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setTelefone(rawValue.slice(0, 11));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setCpf(rawValue.slice(0, 11));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        if (!credential) {
          toast({
            title: "Erro",
            description: "Por favor, insira seu telefone ou CPF.",
            variant: "destructive",
          });
          return;
        }
        await login(credential, onAuthSuccess);
      } else {
        if (telefone.length < 10 || telefone.length > 11) {
          toast({
            title: "Erro",
            description: "O telefone deve ter 10 ou 11 dígitos.",
            variant: "destructive",
          });
          return;
        }
        if (cpf.length !== 11) {
          toast({
            title: "Erro",
            description: "O CPF deve ter 11 dígitos.",
            variant: "destructive",
          });
          return;
        }
        if (!name) {
          toast({
            title: "Erro",
            description: "O nome é obrigatório.",
            variant: "destructive",
          });
          return;
        }
        await register(name, telefone, cpf, onAuthSuccess);
      }
      onClose();
    } catch (error) {
      // Erro já tratado no AuthContext
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{isLogin ? 'Login' : 'Cadastro'}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <div>
              <label htmlFor="credential" className="block text-sm font-medium text-gray-700">
                Telefone ou CPF
              </label>
              <Input
                id="credential"
                type="text"
                value={formatTelefone(credential) || formatCpf(credential)}
                onChange={(e) => setCredential(e.target.value.replace(/\D/g, ''))}
                placeholder="Digite seu telefone ou CPF"
                required
                className="mt-1 border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="mt-1 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">Telefone</label>
                <Input
                  id="telefone"
                  type="text"
                  value={formatTelefone(telefone)}
                  onChange={handleTelefoneChange}
                  placeholder="(11) 99999-9999"
                  required
                  className="mt-1 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF</label>
                <Input
                  id="cpf"
                  type="text"
                  value={formatCpf(cpf)}
                  onChange={handleCpfChange}
                  placeholder="123.456.789-00"
                  required
                  className="mt-1 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </>
          )}
          <Button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-primary hover:underline text-sm"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Ainda não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AuthModal;