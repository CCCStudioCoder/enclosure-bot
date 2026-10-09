import { useEffect, useRef, useState } from "react";
import {
  type Polygon,
  type Coords,
  type Edge,
  type GameClone,
  type Move,
  sameCoords,
  Alternator,
  fromIndex,
  sameEdge,
} from "./util";
import { availableMove, applyMove } from "./game";

export default function App() {

  const gameRef = useRef<HTMLCanvasElement | null>(null);

  const [turn, setTurn] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Coords|null>(null);
  const [movesRemaining, setMovesRemaining] = useState(1);
  const [invincibleEdges, setInvincibleEdges] = useState<Edge[]>([]);
  const [edgesThisTurn, setEdgesThisTurn] = useState<Edge[]>([]);
  const [availableMoves, setAvailableMoves] = useState<number[]>([]); // indexes
  const [legalMoves, setLegalMoves] = useState<Move[]>([]); // move meta
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [bluePlaced, setBluePlaced] = useState(0);
  const [redPlaced, setRedPlaced] = useState(0);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const [blueNodes, setBlueNodes] = useState<Coords[]>([
    [0, 9],
    [3, 9],
  ]);
  const [redNodes, setRedNodes] = useState<Coords[]>([
    [15, 9],
    [18, 9],
  ]);

  const nodeAlternator = new Alternator(blueNodes, redNodes, turn);

  const [blueEdges, setBlueEdges] = useState<Edge[]>([
    [
      [0, 9],
      [3, 9],
    ],
  ]);
  const [redEdges, setRedEdges] = useState<Edge[]>([
    [
      [15, 9],
      [18, 9],
    ],
  ]);

  const edgeAlternator = new Alternator(blueEdges, redEdges, turn);

  const [bluePolygons, setBluePolygons] = useState<Polygon[]>([]);
  const [redPolygons, setRedPolygons] = useState<Polygon[]>([]);

  const polygonAlternator = new Alternator(bluePolygons, redPolygons, turn);

  const clone: GameClone = {
    turn: turn,
    moveRemaining: movesRemaining,
    invincibleEdges: invincibleEdges,
    edgesThisTurn: edgesThisTurn,
    blueScore: blueScore,
    redScore: redScore,
    bluePlaced: bluePlaced,
    redPlaced: redPlaced,
    nodeAlternator: nodeAlternator,
    edgeAlternator: edgeAlternator,
    polygonAlternator: polygonAlternator,
    legalMoves: legalMoves
  };

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

      const edges = edgeAlternator.get(side);

      for (const edge of edges) {
        canvas.lineWidth = invincibleEdges.some((protectedEdge) => sameEdge(protectedEdge, edge)) ? 10 : 5;
        canvas.beginPath();
        canvas.moveTo(edge[0][0] * 40 + 5, edge[0][1] * 40 + 5);
        canvas.lineTo(edge[1][0] * 40 + 5, edge[1][1] * 40 + 5);
        canvas.stroke();
        canvas.closePath();
      }

      for (const polygon of polygonAlternator.get(side)) {
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
  }, [gameRef, blueEdges, redEdges, bluePolygons, redPolygons, invincibleEdges, edgesThisTurn]);

  return (
    <main className="App flex flex-col items-center">
      <h1 className="text-3xl">Enclosure bot</h1>
      <section className="mb-3 flex gap-6 text-lg" aria-live="polite">
        <span className="text-blue-700">Blue: {blueScore.toFixed(2)} points ({bluePlaced}/120 edges)</span>
        <span className="text-red-700">Red: {redScore.toFixed(2)} points ({redPlaced}/120 edges)</span>
        {gameResult && <strong>{gameResult}</strong>}
      </section>
      <div className="relative flex items-center">
        <canvas
          width={800}
          height={800}
          className="pointer-events-none z-10"
          ref={gameRef}
        ></canvas>
        {Array.from({ length: 361 }).map((_, i) => {
          const coords: Coords = fromIndex(i);

          const blueNode = blueNodes.find((node) =>
            sameCoords(node, coords),
          );
          const redNode = redNodes.find((node) =>
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

          const size = sameCoords(selectedNode, coords) ? 32 : 12;
          return (
            <div className="absolute flex justify-center items-center h-8 w-8 point" style={{
              left: coords[0] * 40 + 5 - 16,
              top: coords[1] * 40 + 5 - 16,
              cursor: (availableMoves.length != 0 ? isMove : isAvailableNode)
                ? "pointer"
                : "initial",
            }} onClick={() => handleClick(coords, isMove, isAvailableNode)} data-pos={coords} key={i}>
              <div
                className={`absolute inline-block rounded-full ${color}`}
                style={{
                  height: size,
                  width: size,
                }}
              />
            </div>
          );
        })}
      </div>
    </main>
  );

  function handleClick(
    coords: Coords,
    isMove: boolean,
    isAvailableNode: boolean,
  ) {
    if (gameResult) return;
    if (!isMove && !isAvailableNode) return;

    if (isMove) {
      const newClone = applyMove(clone, coords);

      if (newClone.bluePlaced >= 120 && newClone.redPlaced >= 120) {
        setGameResult(newClone.blueScore === newClone.redScore ? "Draw" : newClone.blueScore > newClone.redScore ? "Blue wins" : "Red wins");
      }

      applyGameClone(newClone);
      setSelectedNode(null);
      setAvailableMoves([]);
      setLegalMoves([]);
      
      return;
    }

    if(isAvailableNode) {
      const availableMoves = availableMove(clone, coords);

      setSelectedNode(coords);
      setAvailableMoves(availableMoves[0]);
      setLegalMoves(availableMoves[1]);

      return;
    }

    setSelectedNode(null);
    
  }

  function applyGameClone(clone: GameClone) {
    setTurn(clone.turn);
    setMovesRemaining(clone.moveRemaining);
    setInvincibleEdges(clone.invincibleEdges);
    setEdgesThisTurn(clone.edgesThisTurn)
    setBlueScore(clone.blueScore);
    setRedScore(clone.redScore);
    setBluePlaced(clone.bluePlaced);
    setRedPlaced(clone.redPlaced);
    setBlueNodes(clone.nodeAlternator.get(true));
    setRedNodes(clone.nodeAlternator.get(false));
    setBlueEdges(clone.edgeAlternator.get(true));
    setRedEdges(clone.edgeAlternator.get(false));
    setBluePolygons(clone.polygonAlternator.get(true));
    setRedPolygons(clone.polygonAlternator.get(false));
    console.log(bluePolygons);
    console.log(redPolygons);
    setLegalMoves(clone.legalMoves);
  }

}
