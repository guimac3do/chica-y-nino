import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Produtos from "./pages/produtos";
import Carrinho from "./pages/carrinho";
import './output.css';


function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/carrinho" element={<Carrinho />} />
      </Routes>
  );
}

export default App;
