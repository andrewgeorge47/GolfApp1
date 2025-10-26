import React from 'react';
import { Spinner } from './Loading';

interface SimpleLoadingProps {
  text?: string;
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Spinner size="lg" />
      <p className="text-gray-600 mt-3">{text}</p>
    </div>
  );
};

export default SimpleLoading;
