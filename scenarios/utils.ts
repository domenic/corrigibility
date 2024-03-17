import { type Simulation } from "../src/simulation.ts";
import { type SimulationResult } from "../src/simulation_result.ts";

export function simResultOutput<ActionType extends string>(
  lobbyingPower: number,
  sim: Simulation<ActionType>,
  simResult: SimulationResult<ActionType>,
): string {
  return lobbyingPower.toFixed(1) + "  |  " +
    simResult.trace().padEnd(sim.totalSteps + 1);
}
