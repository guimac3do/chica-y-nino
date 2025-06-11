import React from 'react';
import { 
    ChevronRight,
  } from 'lucide-react';

type BreadcrumbItem = {
    label: string;
    href?: string;
  };

  type HeaderProps = {
    breadcrumbs: BreadcrumbItem[];
  };

const Breadcrumbs: React.FC<HeaderProps> = ({ breadcrumbs }) => {
    return (
        <div className="flex items-center space-x-2 p-0 sm:pb-8">
            {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
                {index > 0 && <ChevronRight size={16} className="text-gray-500" />}
                <a 
                href={item.href} 
                className={`
                    ${item.href 
                    ? 'text-blue-600 hover:underline' 
                    : 'text-gray-600'
                    }
                `}
                >
                {item.label}
                </a>
            </React.Fragment>
            ))}
        </div>
);
};

export default Breadcrumbs;