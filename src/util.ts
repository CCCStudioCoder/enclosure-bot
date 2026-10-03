import { useState } from "react";

type Coords = [number, number];

function sameCoords(a: Coords, b: Coords) {
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
  a: ArrayMeta<T>;
  b: ArrayMeta<T>;
  base: boolean;

  constructor(a: ArrayMeta<T>, b: ArrayMeta<T>, base: boolean) {
    this.a = a;
    this.b = b;
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

function doesCross(one: Edge, two: Edge) {
  const a = one[0], b = one[1], c = two[0], d = two[1];

  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);

  return ((c1 > 0 && c2 < 0) || (c1 < 0 && c2 > 0)) &&
        ((c3 > 0 && c4 < 0) || (c3 < 0 && c4 > 0));
}

function areaOf(polygon: Polygon) {
  if(polygon.area) return polygon.area;

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

function buildMask(): number[] {
  const mask: number[] = [];

  for(let i = 0; i < 49; i++) {
    if(i == 27) continue;

    const x = i % 7 - 3;
    const y = Math.floor(i / 7) - 3;

    mask.push(y * 8 + x);
  }

  return mask;
}

export { sameCoords, useArray, doesCross, areaOf, buildMask };
export type { Coords, Edge, Polygon, Move };