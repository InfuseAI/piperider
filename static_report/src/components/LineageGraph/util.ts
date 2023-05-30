export function getStat(data?: object, key: string = ''): number | undefined {
  if (data === undefined || data.hasOwnProperty(key) === false) {
    return undefined;
  }

  return data[key];
}

export function getStatDiff(
  base?: object,
  target?: object,
  key: string = '',
  style: 'percent' | 'decimal' = 'decimal',
): {
  statValue?: number;
  statValueF?: string;
  statChange?: number;
  statChangeP?: string;
} {
  if (target === undefined || target.hasOwnProperty(key) === false) {
    return {};
  }

  if (base === undefined || base.hasOwnProperty(key) === false) {
    return { statValue: getStat(target, key) };
  }

  const statValue = target[key];
  const statValueF =
    statValue !== undefined
      ? new Intl.NumberFormat('en-US', {
          style: style,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(statValue)
      : undefined;
  const statChange = target[key] - base[key];
  const statChangeRatio =
    base[key] !== 0
      ? statChange / base[key]
      : target[key] === 0
      ? 0
      : undefined;
  const statChangeP =
    statChangeRatio !== undefined
      ? new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(statChangeRatio)
      : undefined;

  return { statValue, statValueF, statChange, statChangeP };
}
