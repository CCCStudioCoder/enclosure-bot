import { Alternator, areaOf, buildMask, findCyclesClosedByEdge, pointOnSegmentInterior, sameCoords, sameEdge, segmentsTouch, type Coords, type Edge, type GameClone, type Move, type Polygon } from "./util";

const aroundMask: Coords[] = buildMask();

function availableMove(clone: GameClone, coords: Coords): [number[], Move[]] {
    const availableMoveIndexes: number[] = [];
    const availableMoves: Move[] = [];

    for (const [xOffset, yOffset] of aroundMask) {
        const target: Coords = [coords[0] + xOffset, coords[1] + yOffset];
        if (target[0] < 0 || target[0] >= 19 || target[1] < 0 || target[1] >= 19) continue;
        const index = target[1] * 19 + target[0];
        const move = legalMove(
            clone.edgeAlternator,
            clone.turn,
            clone.invincibleEdges,
            coords, target
        );
        if (move != "illegal") {
            availableMoveIndexes.push(index);
            availableMoves.push(move);
        }
    }

    return [availableMoveIndexes, availableMoves];
}

function legalMove(
    edgeAlternator: Alternator<Edge[]>,
    turn: boolean,
    invincibleEdges: Edge[],
    from: Coords,
    to: Coords
): Move | "illegal" {
    if (sameCoords(from, to)) {
        console.log("Same coords");
        return "illegal";
    }
    const newEdge: Edge = [from, to];
    let cutEdge = -1;

    const opponentEdges = edgeAlternator.get(!turn);
    const crossedOpponentEdges = opponentEdges
        .map((edge, index) => ({ edge, index }))
        .filter(({ edge }) => segmentsTouch(newEdge, edge));
    const crossesInvincibleEdge = crossedOpponentEdges.some(({ edge }) =>
        invincibleEdges.some((protectedEdge) => sameEdge(protectedEdge, edge)),
    );
    const cuttableEdges = crossedOpponentEdges.filter(({ edge }) =>
        !invincibleEdges.some((protectedEdge) => sameEdge(protectedEdge, edge)),
    );
    if (cuttableEdges.length === 1) cutEdge = cuttableEdges[0].index;

    const destinationOnOwnEdge = edgeAlternator.get().some(([start, end]) =>
        pointOnSegmentInterior(to, start, end),
    );

    if (crossesInvincibleEdge || crossedOpponentEdges.length > 1 || destinationOnOwnEdge) {
        console.log(`${to} rejected. Crosses invincible edge: ${crossesInvincibleEdge}. Crosses multiple opponent edges: ${crossedOpponentEdges.length > 1}. Destination on own edge: ${destinationOnOwnEdge}`);
        return "illegal";
    }

    const move = {
        from: from,
        to: to,
        cutEdge: cutEdge
    };

    console.log(`Accepted move ${from} -> ${to}`)
    return move;
}

function applyMove(clone: GameClone, coords: Coords): GameClone {
    const move = clone.legalMoves.find((move) => sameCoords(move.to, coords))!;

    const placedEdge: Edge = [move.from, move.to];
    const ownEdges = clone.edgeAlternator.get();
    const newPolygons = findCyclesClosedByEdge(ownEdges, placedEdge);
    ownEdges.push(placedEdge);
    const ownedPolygons = clone.polygonAlternator.get();
    const existingKeys = new Set(ownedPolygons.map((polygon) => polygon.nodes.map(([x, y]) => `${x},${y}`).sort().join(";")));
    const acceptedPolygons: Polygon[] = [];
    for (const polygon of newPolygons) {
        const key = polygon.nodes.map(([x, y]) => `${x},${y}`).sort().join(";");
        if (!existingKeys.has(key)) {
            existingKeys.add(key);
            acceptedPolygons.push(polygon);
            ownedPolygons.push(polygon);
        }
    }
    const nextEdgesThisTurn = [...clone.edgesThisTurn, placedEdge];

    const ownNodes = clone.nodeAlternator.get();
    if (!ownNodes.some((node) => sameCoords(node, move.to))) {
        ownNodes.push(move.to);
    }

    if (move.cutEdge !== -1) {
        const opponentEdges = clone.edgeAlternator.get(!clone.turn);
        const cutEdge = opponentEdges[move.cutEdge];
        opponentEdges.splice(move.cutEdge, 1);

        // A captured shape only remains enclosed while all of its edges do.
        const opponentPolygons = clone.polygonAlternator.get(!clone.turn);
        const brokenPolygonIndexes = opponentPolygons
            .map((polygon, index) => polygon.edges.some((edge) => sameEdge(edge, cutEdge)) ? index : -1)
            .filter((index) => index !== -1);
        for (const index of brokenPolygonIndexes.reverse()) opponentPolygons.splice(index, 1);

        const opponentNodes = clone.nodeAlternator.get(!clone.turn);
        for (const endpoint of cutEdge) {
            const stillConnected = opponentEdges.some((edge) =>
                sameCoords(edge[0], endpoint) || sameCoords(edge[1], endpoint),
            );
            if (!stillConnected) {
                const nodeIndex = opponentNodes.findIndex((node) =>
                    sameCoords(node, endpoint),
                );
                if (nodeIndex !== -1) opponentNodes.splice(nodeIndex, 1);
            }
        }
    }

    const cutEdge = move.cutEdge === -1 ? undefined : clone.edgeAlternator.get(!clone.turn)[move.cutEdge];
    
    const bluePolygons = clone.polygonAlternator.get(true);
    const redPolygons = clone.polygonAlternator.get(false);
    
    const survivingBluePolygons = clone.turn ? bluePolygons : bluePolygons.filter((polygon) => !cutEdge || !polygon.edges.some((edge) => sameEdge(edge, cutEdge)));
    const survivingRedPolygons = clone.turn ? redPolygons.filter((polygon) => !cutEdge || !polygon.edges.some((edge) => sameEdge(edge, cutEdge))) : redPolygons;
    
    const bluePolygonsNow = clone.turn ? [...survivingBluePolygons, ...acceptedPolygons] : survivingBluePolygons;
    const redPolygonsNow = clone.turn ? survivingRedPolygons : [...survivingRedPolygons, ...acceptedPolygons];

    const nextBlueScore = clone.blueScore + bluePolygonsNow.reduce((sum, polygon) => sum + areaOf(polygon), 0);
    const nextRedScore = clone.redScore + redPolygonsNow.reduce((sum, polygon) => sum + areaOf(polygon), 0);

    const nextBluePlaced = clone.bluePlaced + (clone.turn ? 1 : 0);
    const nextRedPlaced = clone.redPlaced + (clone.turn ? 0 : 1);

    clone.blueScore = nextBlueScore;
    clone.redScore = nextRedScore;
    clone.bluePlaced = nextBluePlaced;
    clone.redPlaced = nextRedPlaced;
   
    if (clone.moveRemaining > 1) {
        clone.edgesThisTurn = nextEdgesThisTurn;
        clone.moveRemaining -= 1;
    } else {
        clone.invincibleEdges = nextEdgesThisTurn.slice(-2);
        clone.edgesThisTurn = [];
        clone.turn = !clone.turn;
        clone.moveRemaining = 2;
    }

    return clone;
}

export { availableMove, legalMove, applyMove };