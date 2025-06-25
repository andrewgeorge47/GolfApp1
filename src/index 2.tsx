import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import GolfScrambleApp from './GolfScrambleApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <GolfScrambleApp />
  </React.StrictMode>
); 