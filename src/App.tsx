import { useEffect, useRef, useState } from "react";
import {
  type Polygon,
  useArray,
  type Coords,
  type Edge,
  buildMask,
  type Move,
  sameCoords,
  Alternator,
  fromIndex,
  doesCross,
} from "./util";

export default function App() {

  const gameRef = useRef<HTMLCanvasElement | null>(null);
  let aroundMask: number[] = [];

  const [turn, setTurn] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Coords | null>(null);
  const [availableMoves, setAvailableMoves] = useState<number[]>([]); // indexes
  const [legalMoves, setLegalMoves] = useState<Move[]>([]); // move meta

  const blueNodes = useArray<Coords>([
    [0, 9],
    [3, 9],
  ]);
  const redNodes = useArray<Coords>([
    [15, 9],
    [18, 9],
  ]);

  const nodeAlternator = new Alternator(blueNodes, redNodes, turn);

  const blueEdges = useArray<Edge>([
    [
      [0, 9],
      [3, 9],
    ],
  ]);
  const redEdges = useArray<Edge>([
    [
      [15, 9],
      [18, 9],
    ],
  ]);

  const edgeAlternator = new Alternator(blueEdges, redEdges, turn);

  const bluePolygons = useArray<Polygon>([]);
  const redPolygons = useArray<Polygon>([]);

  const polygonAlternator = new Alternator(bluePolygons, redPolygons, turn);

  useEffect(() => {
    aroundMask = buildMask();
  }, []);

  useEffect(() => {
    if (!gameRef.current) return;
    const canvas = gameRef.current.getContext("2d")!;
    canvas.clearRect(0, 0, 800, 800);

    canvas.strokeStyle = "rgb(50, 50, 255)";
    canvas.fillStyle = "rgba(50, 50, 255, 0.6)";

    for (const side of [true, false]) {
      canvas.strokeStyle = side ? "rgb(50, 50, 255)" : "rgb(255, 50, 50)";
      canvas.fillStyle = side
        ? "rgba(50, 50, 255, 0.6)"
        : "rgba(255, 50, 50, 0.6)";

      const edges = edgeAlternator.get(side).value;

      for (const [i, edge] of edges.entries()) {
        canvas.lineWidth = i === edges.length - 1 ? 10 : 5;
        canvas.beginPath();
        canvas.moveTo(edge[0][0] * 40 + 5, edge[0][1] * 40 + 5);
        canvas.lineTo(edge[1][0] * 40 + 5, edge[1][1] * 40 + 5);
        canvas.stroke();
        canvas.closePath();
      }

      for (const polygon of polygonAlternator.get(side).value) {
        canvas.beginPath();

        const points = polygon.nodes.length;
        const beginNode = polygon.nodes[points - 1];

        canvas.moveTo(beginNode[0] * 40 + 5, beginNode[1] * 40 + 5);

        for (let point = 0; point < points; point++) {
          const node = polygon.nodes[point];
          canvas.lineTo(node[0] * 40 + 5, node[1] * 40 + 5);
        }

        canvas.fill();
        canvas.closePath();
      }
    }
  }, [gameRef, blueEdges, redEdges, bluePolygons, redPolygons]);

  return (
    <main className="App flex flex-col items-center">
      <h1 className="text-3xl">Enclosure bot</h1>
      <div className="relative flex items-center">
        <canvas
          width={800}
          height={800}
          className="pointer-events-none z-10"
          ref={gameRef}
        ></canvas>
        {Array.from({ length: 361 }).map((_, i) => {
          const coords: Coords = fromIndex(i);

          const blueNode = blueNodes.value.find((node) =>
            sameCoords(node, coords),
          );
          const redNode = redNodes.value.find((node) =>
            sameCoords(node, coords),
          );

          const color = blueNode
            ? "bg-blue-400"
            : redNode
              ? "bg-red-400"
              : "bg-gray-500";

          const isMove = availableMoves.includes(i);
          const isAvailableNode =
            (turn && blueNode != undefined) || (!turn && redNode != undefined);

          return (
            <div
              key={i}
              className={`absolute inline-block h-3 w-3 rounded-full ${color}`}
              style={{
                left: coords[0] * 40,
                top: coords[1] * 40,
                cursor: (availableMoves.length != 0 ? isMove : isAvailableNode)
                  ? "pointer"
                  : "initial",
              }}
              onClick={() => handleClick(i, coords, isMove, isAvailableNode)}
            />
          );
        })}
      </div>
    </main>
  );

  function isLonelyNode(coords: Coords) {
    const nodes = nodeAlternator.get(!turn).value;
    return nodes.filter((node) => sameCoords(node, coords)).length == 1;
  }

  function handleClick(
    originIndex: number,
    coords: Coords,
    isMove: boolean,
    isAvailableNode: boolean,
  ) {
    if (!isMove && !isAvailableNode) return;

    if (isMove) {
      const move = legalMoves.find((move) => sameCoords(move.to, coords))!;

      edgeAlternator.get().add([move.from, move.to]);

      if(move.cutEdge != -1) {
        edgeAlternator.get(!turn).remove(move.cutEdge);

        const cutEdge = edgeAlternator.get(!turn).value[move.cutEdge];

        const remove = (node: Coords) => {
          const nodes = nodeAlternator.get(!turn);
          nodes.remove(nodes.value.indexOf(node));
        };

        if (isLonelyNode(cutEdge[0])) remove(cutEdge[0]);
        if (isLonelyNode(cutEdge[1])) remove(cutEdge[1]);
      }

      setTurn(!turn);
      return;
    }

    // so it's a node
    const availableMoveIndexes: number[] = [];
    const availableMoves: Move[] = [];

    for(let i = 0; i < aroundMask.length; i++) {
      const index = originIndex + aroundMask[i];
      const move = legalMove(fromIndex(index));
      if(move != "illegal") {
        availableMoveIndexes.push(index);
        availableMoves.push(move);
      }
    }

    setSelectedNode(coords);
    setAvailableMoves(availableMoveIndexes);
    setLegalMoves(availableMoves);
  }

  function legalMove(to: Coords): Move|"illegal" {
    const newEdge: Edge = [selectedNode!, to];
    let cutEdge = -1;

    const oppCutEdges = edgeAlternator.get(!turn).value.filter((edge, i) => {
      if(doesCross(newEdge, edge)[0]) {
        cutEdge = i;
        return true
      }
      return false;
    });

    const illegalSelfCutEdges = edgeAlternator.get().value.find((edge) => doesCross(edge, newEdge, true)[1]);

    if(oppCutEdges.length > 1 || illegalSelfCutEdges) {
      return "illegal";
    }
    
    return {
      from: selectedNode!,
      to: to,
      cutEdge: cutEdge
    };
  }

}