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
  areaOf,
  findCyclesClosedByEdge,
  sameEdge,
} from "./util";
import { legalMove } from "./game";

const aroundMask: Coords[] = buildMask();

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

  const blueNodes = useArray<Coords>([
    [0, 9],
    [3, 9],
  ]);
  const redNodes = useArray<Coords>([
    [15, 9],
    [18, 9],
  ]);

  const nodeAlternator = new Alternator(blueNodes, redNodes, turn);
  const nodePureAlternator = new Alternator(blueNodes.value, redNodes.value, turn);

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
  const edgePureAlternator = new Alternator(blueEdges.value, redEdges.value, turn);

  const bluePolygons = useArray<Polygon>([]);
  const redPolygons = useArray<Polygon>([]);

  const polygonAlternator = new Alternator(bluePolygons, redPolygons, turn);
  const polygonPureAlternator = new Alternator(bluePolygons.value, redPolygons.value, turn);

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

      for (const edge of edges) {
        canvas.lineWidth = invincibleEdges.some((protectedEdge) => sameEdge(protectedEdge, edge)) ? 10 : 5;
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
  }, [gameRef, blueEdges, redEdges, bluePolygons, redPolygons, invincibleEdges]);

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

          const size = sameCoords(selectedNode, coords) ? 32 : 12;
          return (
            <div className="absolute flex justify-center items-center h-8 w-8 point" style={{
              left: coords[0] * 40 + 5 - 16,
              top: coords[1] * 40 + 5 - 16,
              cursor: (availableMoves.length != 0 ? isMove : isAvailableNode)
                ? "pointer"
                : "initial",
            }} onClick={() => handleClick(coords, isMove, isAvailableNode)} data-pos={coords}>
              <div
                key={i}
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
      const move = legalMoves.find((move) => sameCoords(move.to, coords))!;

      const placedEdge: Edge = [move.from, move.to];
      const ownEdges = edgeAlternator.get();
      const newPolygons = findCyclesClosedByEdge(ownEdges.value, placedEdge);
      ownEdges.add(placedEdge);
      const ownedPolygons = polygonAlternator.get();
      const existingKeys = new Set(ownedPolygons.value.map((polygon) => polygon.nodes.map(([x, y]) => `${x},${y}`).sort().join(";")));
      const acceptedPolygons: Polygon[] = [];
      for (const polygon of newPolygons) {
        const key = polygon.nodes.map(([x, y]) => `${x},${y}`).sort().join(";");
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          acceptedPolygons.push(polygon);
          ownedPolygons.add(polygon);
        }
      }
      const nextEdgesThisTurn = [...edgesThisTurn, placedEdge];
      
      const ownNodes = nodeAlternator.get();
      if (!ownNodes.value.some((node) => sameCoords(node, move.to))) {
        ownNodes.add(move.to);
      }

      if (move.cutEdge !== -1) {
        const opponentEdges = edgeAlternator.get(!turn);
        const cutEdge = opponentEdges.value[move.cutEdge];
        opponentEdges.remove(move.cutEdge);

        // A captured shape only remains enclosed while all of its edges do.
        const opponentPolygons = polygonAlternator.get(!turn);
        const brokenPolygonIndexes = opponentPolygons.value
          .map((polygon, index) => polygon.edges.some((edge) => sameEdge(edge, cutEdge)) ? index : -1)
          .filter((index) => index !== -1);
        for (const index of brokenPolygonIndexes.reverse()) opponentPolygons.remove(index);

        const opponentNodes = nodeAlternator.get(!turn);
        for (const endpoint of cutEdge) {
          const stillConnected = opponentEdges.value.some((edge) =>
            sameCoords(edge[0], endpoint) || sameCoords(edge[1], endpoint),
          );
          if (!stillConnected) {
            const nodeIndex = opponentNodes.value.findIndex((node) =>
              sameCoords(node, endpoint),
            );
            if (nodeIndex !== -1) opponentNodes.remove(nodeIndex);
          }
        }
      }

      const cutEdge = move.cutEdge === -1 ? undefined : edgeAlternator.get(!turn).value[move.cutEdge];
      const survivingBluePolygons = turn ? bluePolygons.value : bluePolygons.value.filter((polygon) => !cutEdge || !polygon.edges.some((edge) => sameEdge(edge, cutEdge)));
      const survivingRedPolygons = turn ? redPolygons.value.filter((polygon) => !cutEdge || !polygon.edges.some((edge) => sameEdge(edge, cutEdge))) : redPolygons.value;
      const bluePolygonsNow = turn ? [...survivingBluePolygons, ...acceptedPolygons] : survivingBluePolygons;
      const redPolygonsNow = turn ? survivingRedPolygons : [...survivingRedPolygons, ...acceptedPolygons];
      const nextBlueScore = blueScore + bluePolygonsNow.reduce((sum, polygon) => sum + areaOf(polygon), 0);
      const nextRedScore = redScore + redPolygonsNow.reduce((sum, polygon) => sum + areaOf(polygon), 0);
      const nextBluePlaced = bluePlaced + (turn ? 1 : 0);
      const nextRedPlaced = redPlaced + (turn ? 0 : 1);
      setBlueScore(nextBlueScore);
      setRedScore(nextRedScore);
      setBluePlaced(nextBluePlaced);
      setRedPlaced(nextRedPlaced);
      if (nextBluePlaced >= 120 && nextRedPlaced >= 120) {
        setGameResult(nextBlueScore === nextRedScore ? "Draw" : nextBlueScore > nextRedScore ? "Blue wins" : "Red wins");
      }

      setSelectedNode(null);
      setAvailableMoves([]);
      setLegalMoves([]);
      if (movesRemaining > 1) {
        setEdgesThisTurn(nextEdgesThisTurn);
        setMovesRemaining(movesRemaining - 1);
      } else {
        setInvincibleEdges(nextEdgesThisTurn.slice(-2));
        setEdgesThisTurn([]);
        setTurn(!turn);
        setMovesRemaining(2);
      }
      return;
    }

    if(isAvailableNode) {
      const availableMoveIndexes: number[] = [];
      const availableMoves: Move[] = [];

      for (const [xOffset, yOffset] of aroundMask) {
        const target: Coords = [coords[0] + xOffset, coords[1] + yOffset];
        if (target[0] < 0 || target[0] >= 19 || target[1] < 0 || target[1] >= 19) continue;
        const index = target[1] * 19 + target[0];
        const move = legalMove(edgePureAlternator, turn, invincibleEdges, coords, target);
        if(move != "illegal") {
          availableMoveIndexes.push(index);
          availableMoves.push(move);
        }
      }

      setSelectedNode(coords);
      setAvailableMoves(availableMoveIndexes);
      setLegalMoves(availableMoves);

      return;
    }

    setSelectedNode(null);
    
  }

}
