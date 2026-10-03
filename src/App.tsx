import { useEffect, useRef, useState } from "react";
import { type Polygon, useArray, type Coords, type Edge, buildMask } from "./util";

export default function App() {

  const gameRef = useRef<HTMLCanvasElement | null>(null);
  let aroundMask: number[] = [];

  const [turn, setTurn] = useState(true);
  const [invincibleEdge, setInvincibleEdge] = useState(-1);
  const [selectedNode, setSelectedNode] = useState<Coords|null>(null);
  const [availableMoves, setAvailableMoves] = useState<number[]>([]); // indexes

  const [blueNodes, addBlueNode, removeBlueNode] = useArray<Coords>([
    [0, 9],
    [3, 9],
  ]);
  const [redNodes, addRedNode, removeRedNode] = useArray<Coords>([
    [15, 9],
    [18, 9],
  ]);

  const [blueEdges, addBlueEdge, removeBlueEdge] = useArray<Edge>([
    [
      [0, 9],
      [3, 9],
    ],
  ]);
  const [redEdges, addRedEdge, removeRedEdge] = useArray<Edge>([
    [
      [15, 9],
      [18, 9],
    ],
  ]);

  const [bluePolygons, addBluePolygon, removeBluePolygon] = useArray<Polygon>([]);
  const [redPolygons, addRedPolygon, removeRedPolygon] = useArray<Polygon>([]);

  useEffect(() => {aroundMask = buildMask()}, []);

  useEffect(() => {
    if (!gameRef.current) return;
    const canvas = gameRef.current.getContext("2d")!;
    canvas.clearRect(0, 0, 800, 800);

    canvas.strokeStyle = "rgb(50, 50, 255)";
    canvas.fillStyle = "rgba(50, 50, 255, 0.6)";

    for (const [i, edge] of blueEdges.entries()) {
      canvas.lineWidth = i === invincibleEdge && !turn ? 10 : 5;
      canvas.beginPath();
      canvas.moveTo(edge[0][0] * 40 + 5, edge[0][1] * 40 + 5);
      canvas.lineTo(edge[1][0] * 40 + 5, edge[1][1] * 40 + 5);
      canvas.stroke();
      canvas.closePath();
    }

    for (const polygon of bluePolygons) {
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

    canvas.strokeStyle = "rgb(255, 50, 50)";
    canvas.fillStyle = "rgba(255, 50, 50, 0.6)";

    for (const [i, edge] of redEdges.entries()) {
      canvas.lineWidth = i === invincibleEdge && turn ? 10 : 5;
      canvas.beginPath();
      canvas.moveTo(edge[0][0] * 40 + 5, edge[0][1] * 40 + 5);
      canvas.lineTo(edge[1][0] * 40 + 5, edge[1][1] * 40 + 5);
      canvas.stroke();
      canvas.closePath();
    }

    for (const polygon of redPolygons) {
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
          const coords: Coords = [i % 19, Math.floor(i / 19)];

          const blueNode = blueNodes.find(
            (node) => node[0] === coords[0] && node[1] === coords[1],
          );
          const redNode = redNodes.find(
            (node) => node[0] === coords[0] && node[1] === coords[1],
          );

          const color = blueNode
            ? "bg-blue-400"
            : redNode
              ? "bg-red-400"
              : "bg-gray-500";

		  const isMove = availableMoves.includes(i);
		  const isAvailableNode = (turn && blueNode != undefined) || (!turn && redNode != undefined);

          return (
            <div
              key={i}
              className={`absolute inline-block h-3 w-3 rounded-full ${color}`}
              style={{
                left: coords[0] * 40,
                top: coords[1] * 40,
				cursor: availableMoves.length ? (
					isMove ? "pointer" : "not-allowed"
				) : (
					isAvailableNode ? "pointer" : "initial"
				)
              }}
			  onClick={() => handleClick(coords, isMove, isAvailableNode)}
            />
          );
        })}
      </div>
    </main>
  );

  function handleClick(coords: Coords, isMove: boolean, isAvailableNode: boolean) {
	if(!isMove && !isAvailableNode) return;

	if(isMove) {
		return;
	}


	setSelectedNode(coords);
  }

  function isLegalMove(from: Coords, to: Coords) {
	return true;
  }


}
