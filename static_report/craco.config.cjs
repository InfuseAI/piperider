const CracoEsbuildPlugin = (async () => await import('craco-esbuild'))();

module.exports = {
  plugins: [{ plugin: CracoEsbuildPlugin }],
};
