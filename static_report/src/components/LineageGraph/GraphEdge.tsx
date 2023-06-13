import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';
import { LineageGraphEdge } from '../../utils/dbt';
import { COLOR_ADDED, COLOR_HIGHLIGHT, COLOR_REMOVED } from './style';

interface GraphEdgeProps extends EdgeProps {
  data?: LineageGraphEdge;
}

export default function GraphEdge(props: GraphEdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style: styleOverride = {},
    markerEnd,
    data,
  } = props;

  const style = {
    ...styleOverride,
  };

  style['storke'] = 'gray';
  if (!data?.singleOnly) {
    if (!data?.from.includes('target')) {
      style['stroke'] = COLOR_REMOVED;
      style['strokeDasharray'] = '5';
    } else if (!data?.from.includes('base')) {
      style['stroke'] = COLOR_ADDED;
      style['strokeDasharray'] = '5';
    }
  }

  if (data?.isHighlighted) {
    style['stroke'] = COLOR_HIGHLIGHT;
  }

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, ...styleOverride }}
      />
    </>
  );
}
