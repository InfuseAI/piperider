import { ChakraProvider } from '@chakra-ui/react';
import { render } from 'react-dom';
import React from 'react';
import App from './App';
import reportWebVitals from './reportWebVitals';
import theme from './theme';

render(
  <React.StrictMode>
    <ChakraProvider resetCSS theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
