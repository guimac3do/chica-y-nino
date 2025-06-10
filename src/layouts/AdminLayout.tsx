import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header"
import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar"

interface AdminLayoutProps {
  children: ReactNode;
}


const AdminLayout = ({ children }: AdminLayoutProps) =>  {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="relative min-h-screen">
      <div className="flex">
        <DashboardSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        
        <div className="flex-1 ml-0 lg:ml-64">
          <DashboardHeader onOpenSidebar={toggleSidebar} />
          <main className="bg-gray-60">
            <div className="p-6 sm:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;