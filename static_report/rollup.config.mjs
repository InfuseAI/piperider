import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import nodePolyfills from 'rollup-plugin-node-polyfills';

import packageJson from './package.json' assert { type: 'json' };

// rollup.config.js
/**
 * @type {import('rollup').RollupOptions}
 */
const rollupConfig = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['src/appshell/*', 'src/pages/*'],
      }),
      terser(),
      nodePolyfills(),
    ],
    // external: [
    //   'react',
    //   'react-chartjs-2',
    //   'react-dom',
    //   'react-icons',
    //   '@chakra-ui/icons',
    //   '@chakra-ui/react',
    //   '@chakra-ui/styled-system',
    //   '@chakra-ui/system',
    //   '@chakra-ui/theme-tools',
    //   '@emotion/react',
    //   '@emotion/styled',
    //   '@sgratzl/chartjs-chart-boxplot',
    //   'chart.js',
    //   'chartjs-adapter-date-fns',
    //   'framer-motion',
    // ],
  },
  {
    input: 'dist/esm/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
];
export default rollupConfig;
