import { getDownstreamSet, topologySort } from '../graph';

test('Downstream set', () => {
  /*
   * A -> B -> D -> E
   *   -> C
   */
  const dag = {
    A: ['B', 'C'],
    B: ['D'],
    C: [],
    D: ['E'],
    E: [],
  };

  const getNeighbors = (id) => dag[id];
  expect(getDownstreamSet(['A', 'B', 'D'], getNeighbors)).toEqual(
    new Set(['A', 'B', 'C', 'D', 'E']),
  );
  expect(getDownstreamSet(['B'], getNeighbors)).toEqual(
    new Set(['B', 'D', 'E']),
  );
  expect(getDownstreamSet(['B', 'C'], getNeighbors)).toEqual(
    new Set(['B', 'C', 'D', 'E']),
  );
});

test('Topology sorting', () => {
  /*
   * A -> B -> D -> E
   *   -> C -> F
   * G -> H
   */
  const dag = {
    A: ['B', 'C'],
    B: ['D'],
    C: ['F'],
    D: ['E'],
    E: [],
    F: [],
    G: ['H'],
    H: [],
  };

  const getNeighbors = (id) => dag[id] ?? [];
  expect(topologySort(Object.keys(dag), getNeighbors)).toEqual([
    'A',
    'G',
    'B',
    'C',
    'H',
    'D',
    'F',
    'E',
  ]);
});

test('Topology sorting 2', () => {
  /*
   * A -> B -> D -> H
   *        -> E
   *   -> C -> F
   *        -> G
   */
  const dag = {
    A: ['B', 'C'],
    B: ['D', 'E'],
    C: ['F', 'G'],
    D: ['H'],
    E: [],
    F: [],
    G: [],
    H: [],
  };

  const getNeighbors = (id) => dag[id] ?? [];
  expect(topologySort(Object.keys(dag), getNeighbors)).toEqual([
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
  ]);
});
