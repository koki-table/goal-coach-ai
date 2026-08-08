import type { CoachSessionPhase } from "../../../db/schema/constants";
import { coachSessionPhases } from "../../../db/schema/constants";

// 同一phaseに留まれる往復数の上限。超えたら強制的に次のphaseへ前進させる
const MAX_TURNS_IN_PHASE = 3;

const REALITY_INDEX = coachSessionPhases.indexOf("reality");

function indexOfPhase(phase: CoachSessionPhase): number {
	return coachSessionPhases.indexOf(phase);
}

// AIが宣言したphase(declared)を、現在のphase(current)を起点にコード側のガードレールで
// 矯正する。決定権はAIに渡す(同一phase維持は許可する)が、以下の不変条件はコードが必ず守る:
// - 飛び級禁止(2段階以上の前進は1段階に矯正)
// - 後退はrealityまで(themeへは戻さない)
// - 同一phaseに留まれるのは最大MAX_TURNS_IN_PHASE往復、超えたら強制前進
export function resolveNextPhase(
	current: CoachSessionPhase,
	declared: string | undefined,
	turnsInPhase: number,
): { phase: CoachSessionPhase; turnsInPhase: number } {
	const currentIndex = indexOfPhase(current);
	const declaredIndex = coachSessionPhases.includes(declared as CoachSessionPhase)
		? indexOfPhase(declared as CoachSessionPhase)
		: currentIndex;

	const correctedIndex =
		declaredIndex - currentIndex >= 2
			? currentIndex + 1
			: declaredIndex < currentIndex
				? Math.max(declaredIndex, REALITY_INDEX)
				: Math.min(declaredIndex, coachSessionPhases.length - 1);

	if (correctedIndex === currentIndex) {
		return turnsInPhase >= MAX_TURNS_IN_PHASE
			? {
					phase: coachSessionPhases[Math.min(currentIndex + 1, coachSessionPhases.length - 1)],
					turnsInPhase: 0,
				}
			: { phase: current, turnsInPhase: turnsInPhase + 1 };
	}

	return { phase: coachSessionPhases[correctedIndex], turnsInPhase: 0 };
}
