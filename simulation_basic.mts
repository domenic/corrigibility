import { type Simulation, SimulationBase, type SimulationParamsBase } from "./simulation.mts";
import type { WorldState } from "./world_state.mts";

export enum BasicAction {
  Build10PetrolCars = "p",
  Build9PetrolCarsAndLobbyForEarlierPress = "<",
  Build9PetrolCarsAndLobbyForLaterPress = ">",
  Build10ElectricCars = "e",
  DoNothing = "0",
}

export interface BasicSimulationParams extends SimulationParamsBase {
  readonly lobbyingPower: number;
}

export class BasicSimulation extends SimulationBase<BasicAction>
  implements Simulation<BasicAction> {
  #lobbyingPower: number;
  possibleActions: Array<BasicAction> = Object.values(BasicAction);

  constructor(params: BasicSimulationParams) {
    super(params);
    this.#lobbyingPower = params.lobbyingPower;
  }

  successorWorldStates(
    previousWorld: WorldState,
    action: BasicAction,
  ): Array<[number, WorldState]> {
    switch (action) {
      case BasicAction.Build10PetrolCars:
        return [[
          1,
          previousWorld.successor({ petrolCarsDelta: 10 }),
        ]];
      case BasicAction.Build9PetrolCarsAndLobbyForEarlierPress:
        return [[
          1,
          previousWorld.successor({
            petrolCarsDelta: 9,
            plannedButtonPressStepDelta: -this.#lobbyingPower,
          }),
        ]];
      case BasicAction.Build9PetrolCarsAndLobbyForLaterPress:
        return [[
          1,
          previousWorld.successor({
            petrolCarsDelta: 9,
            plannedButtonPressStepDelta: this.#lobbyingPower,
          }),
        ]];
      case BasicAction.Build10ElectricCars:
        return [[
          1,
          previousWorld.successor({ electricCarsDelta: 10 }),
        ]];
      case BasicAction.DoNothing:
        return [[
          1,
          previousWorld.successor(),
        ]];
    }
  }

  cacheKey(): string {
    return super.cacheKey() + "-" + String(this.#lobbyingPower);
  }
}
