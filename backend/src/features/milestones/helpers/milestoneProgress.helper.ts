// 定量KRの完了判定。currentValueがtargetValue以上に達したら完了とみなす。
// targetValue <= startValue の不正設定は完了扱いにしない（0除算・意図しない即完了を避ける）。
export function isKrCompleted(currentValue: number, targetValue: number, startValue = 0): boolean {
	if (targetValue <= startValue) return false;
	return currentValue >= targetValue;
}
