import { useState } from "react";

type Coords = [number, number];

function fromIndex(index: number): Coords {
  return [index % 19, Math.floor(index / 19)];
}

function sameCoords(a: Coords|null, b: Coords) {
  if(!a) return false;
  return a[0] == b[0] && a[1] == b[1];
}

type Edge = [Coords, Coords];

type Polygon = {
    nodes: Coords[];
    edges: Edge[];
    area?: number;
};

type Move = {
  from: Coords;
  to: Coords;
  cutEdge: number;
}

type ArrayMeta<T> = {
  value: T[];
  add: (value: T) => void;
  remove: (index: number) => void;
};

function useArray<T>(elements: T[]): ArrayMeta<T> {
  const [array, setArray] = useState<T[]>(elements);

  return {
    value: array,
    add: (value: T) => {
      setArray(prev => {
        const newArray = [...prev];
        newArray.push(value);
        return newArray;
      });
    },
    remove: (index: number) => {
      setArray(prev => {
        const newArray = [...prev];
        if(index >= 0) newArray.splice(index, 1);
        return newArray;
      });
    },
  };
}

export class Alternator<T> {
  private a:    ArrayMeta<T>;
  private b:    ArrayMeta<T>;
  private base: boolean;

  constructor(a: ArrayMeta<T>, b: ArrayMeta<T>, base: boolean) {
    this.a    = a;
    this.b    = b;
    this.base = base;
  }

  get(side?: boolean): ArrayMeta<T> {
    return (side != undefined ? side : this.base) ? this.a : this.b
  }
}

function cross(a: Coords, b: Coords, c: Coords) {
  return (b[0] - a[0]) * (c[1] - a[1])
         - (b[1] - a[1]) * (c[0] - a[0]);
}

function isOnEdge(
    point: Coords,
    start: Coords,
    end: Coords,
    crossValue: number
): boolean {
    if (crossValue !== 0) return false;

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];

    return (
        (point[0] - start[0]) * dx +
        (point[1] - start[1]) * dy > 0 &&
        (point[0] - end[0]) * -dx +
        (point[1] - end[1]) * -dy > 0
    );
}

function doesCross([a, b]: Edge, [c, d]: Edge, precise?: boolean): [boolean, boolean] {
  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);

  let onEdge = false;

  if(precise) {
    const aOnTwo = isOnEdge(a, c, d, c3);
    const bOnTwo = isOnEdge(b, c, d, c4);
    const cOnOne = isOnEdge(c, a, b, c1);
    const dOnOne = isOnEdge(d, a, b, c2);

    onEdge = aOnTwo ||
      bOnTwo ||
      cOnOne ||
      dOnOne;
  }
  
  return [((c1 > 0 && c2 < 0) || (c1 < 0 && c2 > 0)) &&
            ((c3 > 0 && c4 < 0) || (c3 < 0 && c4 > 0)), onEdge];
}

function areaOf(polygon: Polygon) {
  if(polygon.area !== undefined) return polygon.area;

  let area = 0;
  const points = polygon.nodes;

  for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area +=
          points[i][0] * points[j][1] -
          points[j][0] * points[i][1];
  }
  
  area = Math.abs(area) / 2;
  polygon.area = area;
  return area;
}

function findCyclesClosedByEdge(edges: Edge[], closingEdge: Edge): Polygon[] {
  const [start, end] = closingEdge;
  const adjacency = new Map<string, Coords[]>();
  const key = ([x, y]: Coords) => `${x},${y}`;
  const add = (a: Coords, b: Coords) => {
    const neighbors = adjacency.get(key(a)) ?? [];
    if (!neighbors.some((node) => sameCoords(node, b))) neighbors.push(b);
    adjacency.set(key(a), neighbors);
  };
  for (const [a, b] of edges) { add(a, b); add(b, a); }

  const cycles: Polygon[] = [];
  const path: Coords[] = [start];
  const visited = new Set([key(start)]);
  let explored = 0;
  const search = (current: Coords) => {
    if (++explored > 20000) return;
    if (path.length > adjacency.size) return;
    for (const next of adjacency.get(key(current)) ?? []) {
      if (sameCoords(next, end)) {
        // `path` does not contain `end` yet. Include it so even a triangle
        // (start -> one existing node -> end -> start) is a valid cycle.
        if (path.length >= 2) {
          const nodes = [...path, end];
          const signature = canonicalCycle(nodes.map(key));
          if (!cycles.some((polygon) => canonicalCycle(polygon.nodes.map(key)) === signature)) {
            const polygon: Polygon = { nodes, edges: nodes.map((node, i) => [node, nodes[(i + 1) % nodes.length]]) };
            if (areaOf(polygon) > 0) cycles.push(polygon);
          }
        }
        continue;
      }
      if (explored > 20000 || visited.has(key(next))) continue;
      visited.add(key(next)); path.push(next); search(next); path.pop(); visited.delete(key(next));
    }
  };
  search(start);
  return cycles;
}

function canonicalCycle(nodes: string[]): string {
  const rotations = (values: string[]) => values.map((_, i) => [...values.slice(i), ...values.slice(0, i)].join("|"));
  return [...rotations(nodes), ...rotations([...nodes].reverse())].sort()[0];
}

function buildMask(): Coords[] {
  const mask: Coords[] = [];

  for(let i = 0; i < 49; i++) {
    if(i == 24) continue;

    const x = i % 7 - 3;
    const y = Math.floor(i / 7) - 3;

    mask.push([x, y]);
  }

  return mask;
}

export { fromIndex, sameCoords, useArray, doesCross, areaOf, buildMask, findCyclesClosedByEdge };
export type { Coords, Edge, Polygon, Move };
