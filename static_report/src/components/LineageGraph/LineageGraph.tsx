import { useReportStore } from '../../utils/store';
import { Comparable } from '../../types';
import CytoscapeComponent from 'react-cytoscapejs';

import Cytoscape from 'cytoscape';
import COSEBilkent from 'cytoscape-cose-bilkent';

Cytoscape.use(COSEBilkent);

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
        label: `${node.type}:${node.name}`,
      },
    });

    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      elements.push({
        data: {
          source: key,
          target: dependsOnKey,
          label: `${key} -> ${dependsOnKey}`,
        },
      });
    });
  });
  const layout = { name: 'cose-bilkent' };
  return (
    <CytoscapeComponent
      elements={elements}
      layout={layout}
      style={{ width: '600px', height: '600px' }}
    />
  );
}
