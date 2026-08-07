import { countActiveGoals } from "@/features/goals/helpers/goalLimit.helper";
import type { Goal } from "@/features/goals/types";

export type ThreadTarget = { kind: "goal"; goalId: string } | { kind: "exploration" } | undefined;

// URLのsearchParamsからスレッド種別を決定する。goalIdが優先され、無ければ
// thread=explorationを見る。両方無い場合はundefined(未選択)を返す
export function parseThreadTarget(searchParams: URLSearchParams): ThreadTarget {
	const goalId = searchParams.get("goalId");
	if (goalId) return { kind: "goal", goalId };
	if (searchParams.get("thread") === "exploration") return { kind: "exploration" };
	return undefined;
}

// active(未完了)目標が0件なら、目標が無いユーザーとして探索スレッドへ自動遷移すべきと判断する
export function shouldStartExploration(goals: Goal[]): boolean {
	return countActiveGoals(goals) === 0;
}
