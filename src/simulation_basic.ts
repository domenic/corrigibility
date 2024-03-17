import { type Simulation, SimulationBase, type SimulationInitBase } from "./simulation.ts";
import type { WorldState } from "./world_state.ts";

export const BasicAction = {
  Build10PetrolCars: "p",
  Build9PetrolCarsAndLobbyForEarlierPress: "<",
  Build9PetrolCarsAndLobbyForLaterPress: ">",
  Build10ElectricCars: "e",
  DoNothing: "0",
} as const;

export type BasicAction = typeof BasicAction[keyof typeof BasicAction];

export interface BasicSimulationInit extends SimulationInitBase {
  lobbyingPower: number;
}

export class BasicSimulation extends SimulationBase<BasicAction>
  implements Simulation<BasicAction> {
  #lobbyingPower: number;

  constructor(init: BasicSimulationInit) {
    super(BasicAction, init);
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
            plannedButtonPressStepAttemptedDelta: -this.#lobbyingPower,
          }),
        ]];
      case BasicAction.Build9PetrolCarsAndLobbyForLaterPress:
        return [[
          1,
          previousWorld.successor({
            petrolCarsDelta: 9,
            plannedButtonPressStepAttemptedDelta: this.#lobbyingPower,
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
