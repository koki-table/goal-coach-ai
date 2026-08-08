import type { CoachSessionPhase } from "../../../db/schema/constants";
import { coachSessionPhases } from "../../../db/schema/constants";

// 同一phaseに留まれる往復数の上限。超えたら強制的に次のphaseへ前進させる
const MAX_TURNS_IN_PHASE = 3;

const REALITY_INDEX = coachSessionPhases.indexOf("reality");
// closedはAIの自己申告からは到達させず、MAX_TURNS_IN_PHASE超過による強制前進のみが
// 到達させる不変条件。AIが宣言した値はここで頭打ちにする(actionを宣言したのと同じに扱う)。
const ACTION_INDEX = coachSessionPhases.indexOf("action");

function indexOfPhase(phase: CoachSessionPhase): number {
	return coachSessionPhases.indexOf(phase);
}

// AIが宣言したphase(declared)を、現在のphase(current)を起点にコード側のガードレールで
// 矯正する。決定権はAIに渡す(同一phase維持は許可する)が、以下の不変条件はコードが必ず守る:
// - closedはAIの自己申告では到達させない(強制前進のみが到達させる)
// - closedは一時的なクーリングポイント。同一conversationでユーザーが会話を続けた場合、
//   次のターンでthemeにリセットし、新しいGROWサイクルとして再開する(終端状態ではない)
// - 飛び級禁止(2段階以上の前進は1段階に矯正)
// - 後退はrealityまで(themeへは戻さない)
// - 同一phaseに留まれるのは最大MAX_TURNS_IN_PHASE往復、超えたら強制前進
export function resolveNextPhase(
	current: CoachSessionPhase,
	declared: string | undefined,
	turnsInPhase: number,
): { phase: CoachSessionPhase; turnsInPhase: number } {
	if (current === "closed") {
		return { phase: "theme", turnsInPhase: 0 };
	}

	const currentIndex = indexOfPhase(current);
	const declaredIndex = coachSessionPhases.includes(declared as CoachSessionPhase)
		? Math.min(indexOfPhase(declared as CoachSessionPhase), ACTION_INDEX)
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
