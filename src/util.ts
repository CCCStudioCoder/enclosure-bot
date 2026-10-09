type Coords = [number, number];

function fromIndex(index: number): Coords {
  return [index % 19, Math.floor(index / 19)];
}

function sameCoords(a: Coords|null, b: Coords) {
  if(!a) return false;
  return a[0] == b[0] && a[1] == b[1];
}

type Edge = [Coords, Coords];

function sameEdge(a: Edge, b: Edge) {
  return (sameCoords(a[0], b[0]) && sameCoords(a[1], b[1])) ||
    (sameCoords(a[0], b[1]) && sameCoords(a[1], b[0]));
}

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

export interface GameClone {
  turn: boolean;
  moveRemaining: number;
  invincibleEdges: Edge[],
  edgesThisTurn: Edge[],
  blueScore: number;
  redScore: number;
  bluePlaced: number;
  redPlaced: number;
  nodeAlternator: Alternator<Coords[]>;
  edgeAlternator: Alternator<Edge[]>;
  polygonAlternator: Alternator<Polygon[]>;
  legalMoves: Move[];
}

export class Alternator<T> {
  private a:    T;
  private b:    T;
  private base: boolean;

  constructor(a: T, b: T, base: boolean) {
    this.a    = a;
    this.b    = b;
    this.base = base;
  }

  get(side?: boolean): T {
    return (side != undefined ? side : this.base) ? this.a : this.b
  }

  clone(): Alternator<T> {
    return new Alternator(this.a, this.b, this.base);
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

function pointOnSegmentInclusive(point: Coords, start: Coords, end: Coords) {
  const cross = (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0]);
  return cross === 0 &&
    point[0] >= Math.min(start[0], end[0]) &&
    point[0] <= Math.max(start[0], end[0]) &&
    point[1] >= Math.min(start[1], end[1]) &&
    point[1] <= Math.max(start[1], end[1]);
}

function pointOnSegmentInterior(point: Coords, start: Coords, end: Coords) {
  const cross = (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0]);
  if (cross !== 0) return false;

  const dot = (point[0] - start[0]) * (point[0] - end[0]) +
    (point[1] - start[1]) * (point[1] - end[1]);
    
  return dot < 0;
}

function segmentsTouch([a, b]: Edge, [c, d]: Edge) {
  if (doesCross([a, b], [c, d])[0]) return true;
  return pointOnSegmentInclusive(a, c, d) ||
    pointOnSegmentInclusive(b, c, d) ||
    pointOnSegmentInclusive(c, a, b) ||
    pointOnSegmentInclusive(d, a, b);
}

function findCyclesClosedByEdge(edges: Edge[], closingEdge: Edge): Polygon[] {
  const [start, end] = closingEdge;
  const adjacency = new Map<string, Coords[]>();
  const key = ([x, y]: Coords) => `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`;
  const add = (a: Coords, b: Coords) => {
    const neighbors = adjacency.get(key(a)) ?? [];
    if (!neighbors.some((node) => key(node) === key(b))) neighbors.push(b);
    adjacency.set(key(a), neighbors);
  };
  const cycles: Polygon[] = [];
  const intersections: Coords[] = [start, end];
  const cross2 = (a: Coords, b: Coords) => a[0] * b[1] - a[1] * b[0];
  for (const [a, b] of edges) {
    const r: Coords = [end[0] - start[0], end[1] - start[1]];
    const s: Coords = [b[0] - a[0], b[1] - a[1]];
    const denominator = cross2(r, s);
    if (denominator === 0) continue;
    const offset: Coords = [a[0] - start[0], a[1] - start[1]];
    const t = cross2(offset, s) / denominator;
    const u = cross2(offset, r) / denominator;
    if (t < 0 || t > 1 || u < 0 || u > 1) continue;
    const point: Coords = [start[0] + t * r[0], start[1] + t * r[1]];
    const normalized: Coords = [Math.round(point[0] * 1e9) / 1e9, Math.round(point[1] * 1e9) / 1e9];
    if (!intersections.some((existing) => key(existing) === key(normalized))) intersections.push(normalized);
  }

  const parameter = (point: Coords, a: Coords, b: Coords) =>
    Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])
      ? (point[0] - a[0]) / (b[0] - a[0])
      : (point[1] - a[1]) / (b[1] - a[1]);
  const alongClosing = (point: Coords) => parameter(point, start, end);
  intersections.sort((a, b) => alongClosing(a) - alongClosing(b));

  const liesOnSegment = (point: Coords, a: Coords, b: Coords) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const cross = dx * (point[1] - a[1]) - dy * (point[0] - a[0]);
    const tolerance = 1e-8 * Math.max(1, Math.abs(dx), Math.abs(dy));
    return Math.abs(cross) <= tolerance &&
      point[0] >= Math.min(a[0], b[0]) - 1e-8 && point[0] <= Math.max(a[0], b[0]) + 1e-8 &&
      point[1] >= Math.min(a[1], b[1]) - 1e-8 && point[1] <= Math.max(a[1], b[1]) + 1e-8;
  };
  for (const [a, b] of edges) {
    const points = intersections.filter((point) => liesOnSegment(point, a, b));
    points.sort((p, q) => parameter(p, a, b) - parameter(q, a, b));
    const splitPoints = [a, ...points.filter((point) => key(point) !== key(a) && key(point) !== key(b)), b];
    for (let i = 0; i < splitPoints.length - 1; i++) {
      add(splitPoints[i], splitPoints[i + 1]);
      add(splitPoints[i + 1], splitPoints[i]);
    }
  }

  for (let pairStart = 0; pairStart < intersections.length - 1; pairStart++) {
    for (let pairEnd = pairStart + 1; pairEnd < intersections.length; pairEnd++) {
      const first = intersections[pairStart];
      const last = intersections[pairEnd];
      const path: Coords[] = [first];
      const visited = new Set([key(first)]);
      let explored = 0;
      const search = (current: Coords) => {
        if (++explored > 20000 || path.length > adjacency.size + 1) return;
        for (const next of adjacency.get(key(current)) ?? []) {
          if (key(next) === key(last)) {
            if (path.length >= 2) {
              const closingSection = intersections.slice(pairStart, pairEnd + 1).reverse().slice(1, -1);
              const nodes = [...path, last, ...closingSection];
              const signature = canonicalCycle(nodes.map(key));
              if (!cycles.some((polygon) => canonicalCycle(polygon.nodes.map(key)) === signature)) {
                const polygon: Polygon = { nodes, edges: nodes.map((node, i) => [node, nodes[(i + 1) % nodes.length]]) };
                if (areaOf(polygon) > 0) cycles.push(polygon);
              }
            }
            continue;
          }
          if (visited.has(key(next))) continue;
          visited.add(key(next)); path.push(next); search(next); path.pop(); visited.delete(key(next));
        }
      };
      search(first);
    }
  }
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

export { fromIndex, sameCoords, sameEdge, doesCross, areaOf, 
  pointOnSegmentInclusive, pointOnSegmentInterior, segmentsTouch, findCyclesClosedByEdge, buildMask };
export type { Coords, Edge, Polygon, Move };
