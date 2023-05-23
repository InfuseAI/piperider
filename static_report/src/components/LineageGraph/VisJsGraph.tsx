import { any } from 'zod';
import { Comparable } from '../../types';
import { useReportStore } from '../../utils/store';
import Graph from 'react-graph-vis';
import { tr } from 'date-fns/locale';

export function VisJsGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();
  const nodes: any[] = [];
  const edges: any[] = [];

  Object.entries(lineageGraph).forEach(([key, node]) => {
    if (node.type === 'test') return;

    const shape = node.name.startsWith('raw_') ? 'database' : 'box';
    // Node
    nodes.push({
      id: key,
      label: `${node.name}`,
      title: `${node.type}:${node.name}`,
      shape: shape,
    });

    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      edges.push({
        from: dependsOnKey,
        to: key,
      });
    });
  });

  const options = {
    autoResize: true,
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR',
        sortMethod: 'directed',
        shakeTowards: 'roots',
      },
    },
    nodes: {
      shape: 'box',
    },
    edges: {
      color: '#000000',
      smooth: {
        type: 'horizontal',
        forceDirection: 'horizontal',
      },
    },
    height: '800px',
  };

  const graph = {
    nodes: nodes,
    edges: edges,
  };
  return (
    <>
      <h1>Vis.js Network Graph</h1>
      <Graph graph={graph} options={options} />
    </>
  );
}
