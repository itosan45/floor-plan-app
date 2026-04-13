
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { EditorProvider } from './contexts/EditorContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <EditorProvider>
          <App />
      </EditorProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
