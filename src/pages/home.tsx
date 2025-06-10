"use client";

import React from 'react';
import ProductsGrid from '@/components/ProductGrid';

const Home: React.FC = () => {
  return (
    <div>
      <div className='flex justify-center'>
        <img className='sm:block hidden mt-[100px]' src="./src/assets/frame_13.webp"/>
        <img className='sm:hidden block mt-20' src="./src/assets/frame_13.webp"/>
      </div>
      <ProductsGrid />
    </div>
  );
};

export default Home;