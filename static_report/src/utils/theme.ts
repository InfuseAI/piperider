import { extendTheme } from '@chakra-ui/react';

const fonts = { heading: `'Inter'`, body: `'Inter'` };

const breakpoints = {
  sm: '40em',
  md: '52em',
  lg: '64em',
  xl: '80em',
};

const theme = extendTheme({
  fonts,
  breakpoints,
  colors: {
    piperider: {
      50: '#FBE8E6',
      100: '#FFC9BA',
      200: '#FEA78E',
      300: '#FD8361',
      400: '#FD673E',
      500: '#FC4b1C',
      600: '#F24518',
      700: '#E43E12',
      800: '#D6370E',
      900: '#BD2905',
    },
    black: '#16161D',
  },
});

export default theme;
export { theme };
