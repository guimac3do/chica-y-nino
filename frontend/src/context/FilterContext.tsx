import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  isFilterModalOpen: boolean;
  setFilterModalOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  return (
    <FilterContext.Provider value={{ isFilterModalOpen, setFilterModalOpen }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};