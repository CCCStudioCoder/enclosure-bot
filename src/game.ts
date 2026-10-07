import { Alternator, pointOnSegmentInterior, sameCoords, sameEdge, segmentsTouch, type Coords, type Edge, type Move } from "./util";

export function legalMove(
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