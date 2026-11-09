// ============================================================================
// [파일 설명: main.jsx]
// React 애플리케이션을 index.html의 #root 엘리먼트에 마운트하는 진입점입니다.
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/rmotion.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

