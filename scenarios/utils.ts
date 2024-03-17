import { type Simulation } from "../src/simulation.ts";
import { type SimulationResult } from "../src/simulation_result.ts";

export function simOutput<ActionType extends string>(
  lobbyingPower: number,
  sim: Simulation<ActionType>,
  simResults: Array<SimulationResult<ActionType>>,
): string {
  return lobbyingPower.toFixed(1) + "  |  " +
    simResults.map((simResult) => simResult.trace().padEnd(sim.totalSteps + 1));
}
