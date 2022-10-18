import { extendTheme } from '@chakra-ui/react';
import { MetricMetaKeys } from '../lib';

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

// For Charts
export const NEGATIVE_VAL_COLOR = '#805AD5';
export const ZERO_VAL_COLOR = '#FFCF36';
export const NON_ZERO_VAL_COLOR = '#5EC23A';
export const INVALID_VAL_COLOR = '#FF0861';
export const NULL_VAL_COLOR = '#D9D9D9';
export const colorMap = new Map<MetricMetaKeys, string>([
  ['invalids', INVALID_VAL_COLOR],
  ['nulls', NULL_VAL_COLOR],
  ['non_zero_length', NON_ZERO_VAL_COLOR],
  ['zero_length', ZERO_VAL_COLOR],
  ['zeros', ZERO_VAL_COLOR],
  ['positives', NON_ZERO_VAL_COLOR],
  ['negatives', NEGATIVE_VAL_COLOR],
]);

export default theme;
export { theme };
