import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';
import CytoscapeComponent from 'react-cytoscapejs';

import Cytoscape from 'cytoscape';
import COSEBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';

Cytoscape.use(dagre);

const stylesheet: any = [
  {
    selector: 'edge.vertical',
    style: {
      'curve-style': 'unbundled-bezier',

      'target-arrow-shape': 'triangle-backcurve',
      'target-arrow-color': '#027599',
      'arrow-scale': 1.5,

      'line-color': '#027599',
      width: 3,

      'target-distance-from-node': '5px',

      'source-endpoint': '0% 50%',
      'target-endpoint': '0deg',
    },
  },
  {
    selector: 'edge.horizontal',
    style: {
      'curve-style': 'unbundled-bezier',

      'target-arrow-shape': 'triangle-backcurve',
      'target-arrow-color': '#006f8a',
      'arrow-scale': 1.5,

      'target-distance-from-node': '10px',
      'source-distance-from-node': '5px',

      'line-color': '#006f8a',
      width: 3,

      'source-endpoint': '50% 0%',
      'target-endpoint': '270deg',
    },
  },
  {
    selector: 'edge[selected=1]',
    style: {
      'line-color': '#bd6bb6',
      'target-arrow-color': '#bd6bb6',

      'z-index': 1, // draw on top of non-selected nodes
    },
  },
  {
    selector: 'node[display="none"]',
    style: {
      display: 'none',
    },
  },
  {
    selector: 'node.vertical',
    style: {
      'text-margin-x': '5px',
      'background-color': '#0094b3',
      'border-color': '#0094b3',
      'font-size': '16px',
      shape: 'ellipse',
      color: '#fff',
      width: '5px',
      height: '5px',
      padding: '5px',
      content: 'data(label)',
      'font-weight': 300,
      'text-valign': 'center',
      'text-halign': 'right',
    },
  },
  {
    selector: 'node.horizontal',
    style: {
      'background-color': '#0094b3',
      'border-color': '#0094b3',
      'font-size': '24px',
      shape: 'roundrectangle',
      color: '#fff',
      width: 'label',
      height: 'label',
      padding: '12px',
      content: 'data(label)',
      'font-weight': 300,
      'font-family':
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      ghost: 'yes',
      'ghost-offset-x': '2px',
      'ghost-offset-y': '4px',
      'ghost-opacity': 0.5,

      'text-outline-color': '#000',
      'text-outline-width': '1px',
      'text-outline-opacity': 0.2,
    },
  },
  {
    selector: 'node[resource_type="source"]',
    style: {
      'background-color': '#5fb825',
      'border-color': '#5fb825',
    },
  },
  {
    selector: 'node[resource_type="exposure"]',
    style: {
      'background-color': '#ff694b',
      'border-color': '#ff694b',
    },
  },
  {
    selector: 'node[resource_type="metric"]',
    style: {
      'background-color': '#ff5688',
      'border-color': '#ff5688',
    },
  },
  {
    selector: 'node[language="python"]',
    style: {
      'background-color': '#6a5acd',
      'border-color': '#6a5acd',
    },
  },
  {
    selector: 'node[node_color]',
    style: {
      'background-color': 'data(node_color)',
      'border-color': 'data(node_color)',
    },
  },
  {
    selector: 'node[selected=1]',
    style: {
      'background-color': '#bd6bb6',
      'border-color': '#bd6bb6',
    },
  },
  {
    selector: 'node.horizontal[selected=1]',
    style: {
      'background-color': '#88447d',
      'border-color': '#88447d',
    },
  },
  {
    selector: 'node.horizontal.dirty',
    style: {
      'background-color': '#919599',
      'border-color': '#919599',
    },
  },
  {
    selector: 'node[hidden=1]',
    style: {
      'background-color': '#919599',
      'border-color': '#919599',
      'background-opacity': 0.5,
    },
  },
  {
    selector: 'node[access="private"]',
    style: {
      'background-opacity': 0.2,
      'border-width': 2,
      ghost: 'no',
    },
  },
];

export function LineageGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();

  //   return (
  //     <ul>
  //       {keys.map((key) => (
  //         <li key={key}>{key}</li>
  //       ))}
  //     </ul>
  //   );

  // const elements = [
  //   { data: { id: 'one', label: 'Node 1' } },
  //   { data: { id: 'two', label: 'Node 2' } },
  //   {
  //     data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' },
  //   },
  // ];
  const elements: any[] = [];
  Object.entries(lineageGraph).forEach(([key, node]) => {
    if (node.type === 'test') return;

    elements.push({
      data: {
        id: key,
        resource_type: node.type,
        label: `${node.name}`,
      },
      classes: 'horizontal',
    });

    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      elements.push({
        data: {
          source: dependsOnKey,
          target: key,
          label: `${key} -> ${dependsOnKey}`,
        },
        classes: 'horizontal',
      });
    });
  });
  const layout = {
    name: 'dagre',
    edgeSep: 30,
    nodeSep: 50,
    rankSep: 200,
    rankDir: 'LR',
  };
  return (
    <CytoscapeComponent
      elements={elements}
      layout={layout}
      style={{
        width: '1000px',
        height: '600px',
        backgroundColor: 'rgb(0, 94, 122)',
      }}
      stylesheet={stylesheet}
    />
  );
}
