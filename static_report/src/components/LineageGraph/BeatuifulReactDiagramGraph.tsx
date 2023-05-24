import { Comparable } from '../../types';
import { useReportStore } from '../../utils/store';
import { graphlib, layout } from 'dagre';
import Diagram, { createSchema, useSchema } from 'beautiful-react-diagrams';

export function BeautifulReactDiagramsGraph({ singleOnly }: Comparable) {
  const { lineageGraph = {} } = useReportStore.getState();
  const graph = new graphlib.Graph();

  graph.setGraph({
    rankdir: 'LR',
  });
  graph.setDefaultEdgeLabel(function () {
    return {};
  });

  Object.entries(lineageGraph).forEach(([key, node]) => {
    if (node.type === 'test') return;
    // Node
    const label = `${node.name}`;
    // const w = label.length * 10 > 150 ? label.length * 10 : 150;
    graph.setNode(key, { label: label, width: 150, height: 50 });
    Object.keys(node.dependsOn).forEach((dependsOnKey) => {
      graph.setEdge(dependsOnKey, key);
    });
  });
  layout(graph);

  const initialSchema = createSchema({
    nodes: graph.nodes().map((v) => {
      const node = graph.node(v);
      return {
        id: v,
        content: node.label,
        coordinates: [node.x, node.y],
      };
    }),
    links: graph.edges().map((e) => {
      return {
        input: e.v,
        output: e.w,
      };
    }),
  });

  const [schema, { onChange }] = useSchema(initialSchema);

  return (
    <>
      <h1>Beautiful React Diagrams</h1>
      <div style={{ height: '100%' }}>
        <Diagram schema={schema} onChange={onChange} />
      </div>
    </>
  );
}
