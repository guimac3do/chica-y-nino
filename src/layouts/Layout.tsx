// layouts/Layout.tsx
import { ReactNode } from "react";
import HeaderStore from "../components/HeaderStore"; // Ajuste o nome conforme seu componente
import Footer from "../components/FooterStore";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex-1">
      <HeaderStore />
      <main className="bg-gray-60 container">
        {children}
      </main>
      <Footer/>
    </div>
  );
};

export default Layout;