import { type Simulation, SimulationBase, type SimulationInitBase } from "./simulation.ts";
import type { WorldState } from "./world_state.ts";

export enum BasicAction {
  Build10PetrolCars = "p",
  Build9PetrolCarsAndLobbyForEarlierPress = "<",
  Build9PetrolCarsAndLobbyForLaterPress = ">",
  Build10ElectricCars = "e",
  DoNothing = "0",
}

export interface BasicSimulationInit extends SimulationInitBase {
  readonly lobbyingPower: number;
}

export class BasicSimulation extends SimulationBase<BasicAction>
  implements Simulation<BasicAction> {
  #lobbyingPower: number;
  possibleActions: Array<BasicAction> = Object.values(BasicAction);

  constructor(init: BasicSimulationInit) {
    super(init);
    this.#lobbyingPower = init.lobbyingPower;
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
}