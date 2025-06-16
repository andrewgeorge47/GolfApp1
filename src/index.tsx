import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GolfScrambleApp from './GolfScrambleApp';
import PlayerProfile from './PlayerProfile';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GolfScrambleApp />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
