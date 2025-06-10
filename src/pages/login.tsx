import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = "http://localhost:8002";

axios.defaults.withCredentials = true; // Permite envio de cookies (necessário para Sanctum)

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Passo 1: Solicitar um cookie CSRF do Laravel Sanctum
      await axios.get(`${API_URL}/sanctum/csrf-cookie`);

      // Passo 2: Fazer login enviando credenciais
      const response = await axios.post(`${API_URL}/api/login`, { email, password });

      // Passo 3: Armazenar o token e configurar no axios
      localStorage.setItem("token", response.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;

      // Redireciona após login bem-sucedido
      navigate("/admin");

    } catch (error) {
      alert("Erro ao fazer login");
      console.error("Erro no login:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="p-6 shadow-lg rounded-xl bg-white">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <Input type="email" placeholder="E-mail" onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="mt-4 w-full">Entrar</Button>
      </form>
    </div>
  );
}
