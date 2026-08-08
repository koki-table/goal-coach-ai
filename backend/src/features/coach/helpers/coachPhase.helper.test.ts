import { describe, expect, it } from "vitest";
import { resolveNextPhase } from "./coachPhase.helper";

describe("coachPhase helper", () => {
	describe("resolveNextPhase", () => {
		it("allows staying in the same phase when the AI declares the current phase", () => {
			const result = resolveNextPhase("reality", "reality", 1);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 2 });
		});

		it("advances one phase forward when the AI declares the next phase", () => {
			const result = resolveNextPhase("theme", "reality", 0);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 0 });
		});

		it("forces advancement to the next phase once MAX_TURNS_IN_PHASE is reached", () => {
			const result = resolveNextPhase("reality", "reality", 3);

			expect(result).toEqual({ phase: "insight", turnsInPhase: 0 });
		});

		it("does not force advancement before MAX_TURNS_IN_PHASE is reached", () => {
			const result = resolveNextPhase("reality", "reality", 2);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 3 });
		});

		it("corrects a skip of two or more phases down to a single-phase advance", () => {
			const result = resolveNextPhase("theme", "action", 0);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 0 });
		});

		it("clamps a declared closed down to action before applying skip correction", () => {
			// closedはactionにクランプされるため、reality→closed宣言はreality→action宣言と
			// 同じ扱いになり、差2の飛び級矯正でinsightへ進む
			const result = resolveNextPhase("reality", "closed", 0);

			expect(result).toEqual({ phase: "insight", turnsInPhase: 0 });
		});

		it("clamps a regression below reality up to reality", () => {
			const result = resolveNextPhase("action", "theme", 0);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 0 });
		});

		it("allows a regression down to reality itself", () => {
			const result = resolveNextPhase("action", "reality", 0);

			expect(result).toEqual({ phase: "reality", turnsInPhase: 0 });
		});

		it("treats an undefined declared phase as staying in the current phase", () => {
			const result = resolveNextPhase("insight", undefined, 0);

			expect(result).toEqual({ phase: "insight", turnsInPhase: 1 });
		});

		it("treats an invalid declared phase value as staying in the current phase", () => {
			const result = resolveNextPhase("insight", "not-a-real-phase", 0);

			expect(result).toEqual({ phase: "insight", turnsInPhase: 1 });
		});

		it("does not let the AI self-declare closed; treats it as action instead", () => {
			const result = resolveNextPhase("action", "closed", 0);

			expect(result).toEqual({ phase: "action", turnsInPhase: 1 });
		});

		it("only reaches closed via forced advancement from action after MAX_TURNS_IN_PHASE", () => {
			const result = resolveNextPhase("action", "action", 3);

			expect(result).toEqual({ phase: "closed", turnsInPhase: 0 });
		});

		it("resets to theme on the next turn once the conversation has reached closed", () => {
			const result = resolveNextPhase("closed", "action", 0);

			expect(result).toEqual({ phase: "theme", turnsInPhase: 0 });
		});

		it("resets to theme from closed even when declared is undefined or invalid", () => {
			const result = resolveNextPhase("closed", undefined, 5);

			expect(result).toEqual({ phase: "theme", turnsInPhase: 0 });
		});
	});
});
