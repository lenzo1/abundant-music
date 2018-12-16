


class ChromaticTransitionHarmonyState {
    constructor() {
        this.harmony = null;
        this.stepCost = 0;
        this._constructorName = 'ChromaticTransitionHarmonyState';
    }

    toString() {
        return JSON.stringify(this);
    }

    copy() {
        return copyObjectDeep(this);
    }
}

class ChromaticTransitionHarmonyGenerator extends HarmonyGenerator {
    constructor(options) {
        super(options);
        this.scaleBaseNote = getValueOrDefault(options,
            'scaleBaseNote', 60);
        this.scaleType = getValueOrDefault(options,
            'scaleType', ScaleType.MAJOR);

        this.scaleBaseChordRootScaleModeTuples = getValueOrDefault(options,
            'scaleBaseChordRootScaleModeTuples', [[this.scaleBaseNote, 0, 0]]);

        this.endScaleBaseChordRootScaleModeTuples = getValueOrDefault(options,
            'endScaleBaseChordRootScaleModeTuples', [[this.scaleBaseNote, 0, 0]]);

        this.chordRootChangeCost = getValueOrDefault(options, 'chordRootChangeCost', 0);
        this.scaleBaseChangeCost = getValueOrDefault(options, 'scaleBaseChangeCost', 0);
        this.scaleModeChangeCost = getValueOrDefault(options, 'scaleModeChangeCost', 0);

        this.noChangeCost = getValueOrDefault(options, 'noChangeCost', 3);
        this.toMuchChangeCost = getValueOrDefault(options, 'toMuchChangeCost', 5);

        this._constructorName = 'ChromaticTransitionHarmonyGenerator';

    }

    addTuple(tuple, lik, cost, result, likelihoods, costs) {
        const harmony = new ConstantHarmonyElement();
        harmony.scaleType = this.scaleType;
        harmony.baseNote = tuple[0];
        harmony.chordRoot = tuple[1];
        harmony.scaleMode = tuple[2];
        const state = new ChromaticTransitionHarmonyState();
        state.harmony = harmony;

        result.push(state);
        likelihoods.push(lik);
        costs.push(cost);
    }

    getStartStateIterator() {
        const result = [];
        const likelihoods = [];
        const costs = [];


        for (let tuple of this.scaleBaseChordRootScaleModeTuples) {
            this.addTuple(tuple, 1, 0, result, likelihoods, costs);
        }

        // Adding the goals as well to avoid search failure
        for (let tuple of this.endScaleBaseChordRootScaleModeTuples) {
            this.addTuple(tuple, 0.1, 1000, result, likelihoods, costs);
        }

        return new RandomDfsStateIterator2(result, likelihoods, costs, this.rnd);
    }

    isGoalState(state) {
        const harmony = state.harmony;

        for (const tuple of this.endScaleBaseChordRootScaleModeTuples) {
            if ((tuple[0] % 12) == (harmony.baseNote % 12) &&
                (tuple[1] % 7) == (harmony.chordRoot % 12) &&
                (tuple[2] % 7) == (harmony.scaleMode % 7)) {
                return true;
            }
        }

        return false;
    }

    isInvalidState(state) {
        return false;
    }

    getSuccessors(state, states, likelihoods, costs) {
        const rootProgressions = [0, 1, 2, 3, 4, 5, 6];
        const rootProgressionLikelihoods = [1, 1, 1, 1, 1, 1, 1];
        const rootProgressionCosts = [0, 0, 0, 0, 0, 0, 0];
        const modeProgressions = [0, 1, 2, 3, 4, 5, 6];
        const modeProgressionLikelihoods = [1, 1, 1, 1, 1, 1, 1];
        const modeProgressionCosts = [0, 0, 0, 0, 0, 0, 0];
        const scaleProgressions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        const scaleProgressionLikelihoods = [1, 0.25, 0.25, 1, 1, 1, 0.1, 1, 1, 1, 0.25, 0.25];
        const scaleProgressionCosts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (const tuple of this.endScaleBaseChordRootScaleModeTuples) {
            this.addTuple(tuple, 0.1, 1000, states, likelihoods, costs);
        }

        let lik = 1;
        let cost = 0;

        function updateLikCost(index, likelihoods, costs) {
            lik *= likelihoods[index % likelihoods.length];
            cost += costs[index % costs.length];
        }

        for (const rp of rootProgressions) {
            for (const mp of modeProgressions) {
                let newState = state.copy();
                let harmony = newState.harmony;
                let oldChordRoot = harmony.chordRoot;
                const oldScaleMode = harmony.scaleMode;
                harmony.chordRoot = positiveMod(harmony.chordRoot + rp, 7);
                harmony.scaleMode = positiveMod(harmony.scaleMode + mp, 7);
                states.push(newState);
                lik = 1;
                cost = 0;
                updateLikCost(rp, rootProgressionLikelihoods, rootProgressionCosts);
                updateLikCost(mp, modeProgressionLikelihoods, modeProgressionCosts);
                if (rp == 0 && mp == 0) {
                    lik *= 0.25;
                    cost += this.noChangeCost;
                } else if (rp != 0 && mp != 0) {
                    lik *= 0.25 * (1.0 / 42.0);
                    cost += this.toMuchChangeCost;
                }

                if (rp != 0) {
                    cost += this.chordRootChangeCost;
                    if (this.chordRootChangeCost > 0.1) {
                        lik *= 0.01;
                    }
                }

                if (mp != 0) {
                    cost += this.scaleModeChangeCost;
                    if (this.scaleModeChangeCost > 0.1) {
                        lik *= 0.01;
                    }
                }

                //            logit(oldChordRoot + " -> " + harmony.chordRoot + " " + oldScaleMode + " -> " + harmony.scaleMode + " " + lik + " " + cost);
                likelihoods.push(lik);
                costs.push(cost);
            }

            for (const sp of scaleProgressions) {
                let newState = state.copy();
                let harmony = newState.harmony;
                let oldChordRoot = harmony.chordRoot;
                const oldBaseNote = harmony.baseNote;
                harmony.chordRoot = positiveMod(harmony.chordRoot + rp, 7);
                harmony.baseNote = ((harmony.baseNote + sp) % 12) + 60;
                states.push(newState);
                lik = 1;
                cost = 0;
                updateLikCost(rp, rootProgressionLikelihoods, rootProgressionCosts);
                updateLikCost(sp, scaleProgressionLikelihoods, scaleProgressionCosts);

                if (rp == 0 && sp == 0) {
                    lik *= 0.25;
                    cost += this.noChangeCost;
                } else if (rp != 0 && sp != 0) {
                    lik *= 0.25 / (7 * 11);
                    cost += this.toMuchChangeCost;
                }

                if (rp != 0) {
                    cost += this.chordRootChangeCost;
                    if (this.chordRootChangeCost > 0.1) {
                        lik *= 0.01;
                    }
                }

                if (sp != 0) {
                    cost += this.scaleBaseChangeCost;
                    if (this.scaleBaseChangeCost > 0.1) {
                        lik *= 0.01;
                    }
                }

                //            logit(oldChordRoot + " -> " + harmony.chordRoot + " " + oldScaleMode + " -> " + harmony.scaleMode + " " + lik + " " + cost);
                likelihoods.push(lik);
                costs.push(cost);
            }
        }
    }

    getSuccessorIterator(node) {
        const state = node.state;

        const possibleNextStates = [];
        const possibleNextStateLikelihoods = [];
        const possibleNextStateCosts = [];

        this.getSuccessors(state, possibleNextStates, possibleNextStateLikelihoods, possibleNextStateCosts);

        return new RandomDfsStateIterator2(possibleNextStates, possibleNextStateLikelihoods, possibleNextStateCosts, this.rnd);
    }
}

