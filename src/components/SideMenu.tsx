import React from 'react';
import { Search } from 'lucide-react';
import { 
  Home, 
  WalletMinimal, 
  PackageSearch, 
  ChevronLeft,
  ChevronRight,
  X 
} from 'lucide-react';

type SidebarMenuItem = {
  icon: React.ComponentType;
  label: string;
  href: string;
};

type SidebarProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
};

const sidebarMenuItems: SidebarMenuItem[] = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: WalletMinimal, label: 'Campanhas', href: '/campanhas' },
  { icon: PackageSearch, label: 'Produtos', href: '/produtos' }
];

const Sidebar: React.FC<SidebarProps> = ({ 
  isSidebarOpen, 
  toggleSidebar, 
  isMobile = false 
}) => {
  const renderContent = () => (
    <>
      {!isMobile && (
        <button 
          onClick={toggleSidebar}
          className={`
            absolute top-4 
            ${isSidebarOpen ? 'right-[-20px]' : 'right-[-10px]'}
            bg-white border rounded-full 
            p-1 shadow-md
            z-10
          `}
        >
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
      )}

      <div className='flex justify-center'><img className='w-[100px] mb-5 sm:mb-0' src="https://chicaynino.com.br/wp-content/uploads/2024/04/Logo-Chica-y-Nino.svg"></img></div>

       {/* Search Bar */}
       <div className="relative max-w-md lg:flex mx-auto">
        <input 
          type="text" 
          placeholder="Search..." 
          className="
            w-full p-2 pl-8 
            border
            focus:outline-none 
            focus:ring-2 text-slate-600
            focus:ring-blue-500 text-sm
           rounded bg-transparent focus:bg-white transition-all
          "
        />
        <Search 
          className="
            absolute left-2 top-1/2 
            transform -translate-y-1/2 
            text-gray-400
          " 
          size={18} 
        />
      </div>

      <nav className="py-4">
        {sidebarMenuItems.map((item, index) => (
          <a 
            key={index} 
            className="
              flex items-center 
              p-3 hover:bg-gray-100 
              cursor-pointer 
              transition-colors
            "
          href={item.href}>
            <span className="mr-3 text-gray-600"><item.icon  /></span>
            {(isSidebarOpen || isMobile) && <span className="text-gray-800">{item.label}</span>}
          </a>
        ))}
      </nav>
    </>
  );

  if (isMobile) {
    return isSidebarOpen ? (
      <div 
        className="
          fixed inset-0 z-40 
          bg-black/50 md:hidden
        "
        onClick={toggleSidebar}
      >
        <aside 
          className="
            w-64 h-full 
            bg-white 
            absolute left-0 top-0 px-4
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="p-4 flex justify-end"
            onClick={toggleSidebar}
          >
            <X className="cursor-pointer text-gray-600" />
          </div>
          {renderContent()}
        </aside>
      </div>
    ) : null;
  }

  return (
    <aside 
      className={`
        ${isSidebarOpen ? 'w-[220px]' : 'w-20'} border-r 
        transition-all
        hidden md:flex flex-col
        relative shadow-sm
        border-slate-200  duration-300 ease-in-out p-4 gap-4 pt-10 h-screen
      `}
    >
      {renderContent()}
    </aside>
  );
};

export default Sidebar;