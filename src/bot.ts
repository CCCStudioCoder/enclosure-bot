import type { Alternator, Edge, Polygon } from "./util";

export interface GameClone {
    turn: boolean;
    moveRemaining: 1|2;
    invincibleEddges: Edge[],
    edgesThisTurn: Edge[],
    blueScore: number;
    redScore: number;
    bluePlaced: number;
    nodeAlternator: Alternator<Node>;
    edgeAlternator: Alternator<Edge>;
    polygonAlternator: Alternator<Polygon>;
}