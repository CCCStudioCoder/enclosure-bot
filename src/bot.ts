import { legalMove } from "./game";
import type { Alternator, Edge, GameClone, Move, Polygon } from "./util";

type TranspositionTable = [Edge[], number][];

const transpositionTable: TranspositionTable = [];
let game: GameClone;

function cloneGame(): GameClone {
    game = game!;
    return {
        ...game,
        invincibleEdges: [...game.invincibleEdges],
        edgesThisTurn: [...game.edgesThisTurn],
        nodeAlternator: game.nodeAlternator.clone(),
        edgeAlternator: game.edgeAlternator.clone(),
        polygonAlternator: game.polygonAlternator.clone(),
        legalMoves: [...game.legalMoves]
    };
}

function chooseBestMove(game: GameClone): void {
    //const legalMoves = game.nodeAlternator.get().map(edge => )
}

function evaluateMove(): number {
    return 0;
}