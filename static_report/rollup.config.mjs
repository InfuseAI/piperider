import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { readFileSync } from 'fs';
import path from 'path';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url)),
);

/**
 * @type {import('rollup').RollupOptions}
 */
const rollupConfig = [
  {
    input: 'src/lib/index.ts',
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
      peerDepsExternal(), //Auto adds to 'external' list
      alias({
        entries: {
          react: path.resolve('./node_modules/react'),
          '@emotion/react': path.resolve('./node_modules/@emotion/react'),
        },
      }),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['./src/*.tsx', './src/pages/*.tsx'],
      }),
      terser(),
      nodePolyfills(),
    ],
  },
  {
    input: 'dist/esm/lib/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
];
export default rollupConfig;
