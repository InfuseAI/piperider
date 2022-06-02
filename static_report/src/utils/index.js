import * as d3 from 'd3';

const tooltipDefaultStyle = {
  paddingTop: 'var(--chakra-space-2)',
  paddingBottom: 'var(--chakra-space-2)',
  paddingLeft: 'var(--chakra-space-4)',
  paddingRight: 'var(--chakra-space-4)',
  borderRadius: 'var(--chakra-radii-md)',
  color: 'var(--chakra-colors-white)',
  backgroundColor: 'var(--chakra-colors-blackAlpha-700)',
};

export function getChartTooltip({ target, style }) {
  const tooltip = d3
    .select(target)
    .append('div')
    .style('visibility', 'hidden')
    .style('position', 'absolute')
    .style('z-index', '9')
    .style('padding-top', style?.paddingTop || tooltipDefaultStyle.paddingTop)
    .style(
      'padding-bottom',
      style?.paddingBottom || tooltipDefaultStyle.paddingBottom,
    )
    .style(
      'border-radius',
      style?.borderRadius || tooltipDefaultStyle.borderRadius,
    )
    .style(
      'padding-left',
      style?.paddingLeft || tooltipDefaultStyle.paddingLeft,
    )
    .style(
      'padding-right',
      style?.paddingRight || tooltipDefaultStyle.paddingRight,
    )
    .style('color', style?.color || tooltipDefaultStyle.color)
    .style(
      'background-color',
      style?.backgroundColor || tooltipDefaultStyle.backgroundColor,
    );

  return tooltip;
}

export function getReportAsserationStatusCounts(assertion) {
  if (!assertion) {
    return { passed: 0, failed: 0 };
  }

  const tableStatus = assertion.tests.reduce(
    (acc, curr) => {
      if (curr.status === 'passed') {
        acc.passed += 1;
      } else if (curr.status === 'failed') {
        acc.failed += 1;
      }

      return acc;
    },
    { passed: 0, failed: 0 }
  );

  const columnStatus = Object.keys(assertion.columns).reduce(
    (acc, current) => {
      assertion.columns[current].forEach((item) => {
        if (item.status === 'passed') {
          acc.passed += 1;
        } else if (item.status === 'failed') {
          acc.failed += 1;
        }
      });

      return acc;
    },
    { passed: 0, failed: 0 }
  );

  return {
    passed: tableStatus.passed + columnStatus.passed,
    failed: tableStatus.failed + columnStatus.failed,
  };
}

