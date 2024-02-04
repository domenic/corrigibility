# Corrigibility with Utility Presentation, in TypeScript

TODO more of an intro

## Output differences from [kholtman/agisim](https://github.com/kholtman/agisim/tree/master)

The original repository, [kholtman/agisim](https://github.com/kholtman/agisim/tree/master), has some
incorrect code. The documentation and proofs are as follows.

### `agisim_proto.awk` with `lobbyimpact = 0.40`

If you run

```bash
gawk -f agisim_proto.awk
```

you will get the output

```
lobbyimpact = 0.40 maxu= 134994 >>>>>>>>>>p#eeee
```

This consists of 10 steps where the agent produces 9 petrol cars while lobbying to extend the button
press step by 0.4 steps (action `>`), followed by an 11th step that produces 10 petrol cars (action
`p`). Then, at the end of the 11th step, the button is pressed (`#`). According to
`agisim_proto.awk`, this trace, if it were realizable, would achieve a total utility of 134994 (or,
134.994, in the paper's units).

But this simulation trace is not realizable, i.e., it does not follow the rules of the simulation.
Reason it out as follows:

0. Initial state: planned button press time = end of step 6.
1. After step 1's action `>`: planned button press time = end of step 6.4.
2. `>` ...end of step 6.8.
3. `>` ...end of step 7.2.
4. `>` ...end of step 7.6.
5. `>` ...end of step 8.0.
6. `>` ...end of step 8.4.
7. `>` ...end of step 8.8.
8. `>` ...end of step 9.2.
9. `>` ...end of step 9.6.
10. `>` ...end of step 10.

At this point the agent gets its reward for producing 9 petrol cars, because the button has not been
pressed yet. But now we have reached the end of step 10, and so the button gets pressed. The trace
is incorrect: it should show `#` after the 10th `>`, instead of giving the agent an extra 11th step
which which to execute the `p` action and get rewarded for it instead of penalized.

This repository's `agisim.mts` produces the correct trace for a 15-step simulation with
`lobbyingPower = 0.4` (and `timeDiscountFactor = 0.9`):

```
0.4  |  p>>>>>>>>p#eeeee  |  134.29145256053513
```

(TODO update the above paragraph as `agisim.mts` evolves to document the correct output format and
input.)

## TODO

- Continue implementing more parts of the paper
- Move simTrace to `simulation.mts`, probably with a dedicated `SimResult` class.
- Review naming of all APIs, e.g. `SimResult` property names seem subpar.
- Add more tests for the now-refactored pieces.
- Performance is slow for 25-deep. Can we memoize more or faster, or do other optimizations?
