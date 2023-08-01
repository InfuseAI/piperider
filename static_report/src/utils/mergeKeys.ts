export function mergeKeys(_base: string[], _target: string[]) {
  // Merge keys from base, target tables. Unlike default union, it preserves the order for column rename, added, removed.
  const base = [..._base];
  const target = [..._target];

  const results: string[] = [];
  while (base.length > 0 && target.length > 0) {
    if (results.includes(base[0])) {
      base.shift();
    } else if (results.includes(target[0])) {
      target.shift();
    } else if (base[0] === target[0]) {
      results.push(base[0]);
      base.shift();
      target.shift();
    } else if (target.includes(base[0])) {
      const idx = target.indexOf(base[0]);
      for (let i = 0; i < idx; i++) {
        if (!results.includes(target[i])) {
          results.push(target[i]);
        }
      }
      results.push(base[0]);
      base.shift();
      target.splice(0, idx + 1);
    } else {
      results.push(base[0]);
      base.shift();
    }
  }

  base.forEach((key) => {
    if (!results.includes(key)) {
      results.push(key);
    }
  });

  target.forEach((key) => {
    if (!results.includes(key)) {
      results.push(key);
    }
  });

  return results;
}
