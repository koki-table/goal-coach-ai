// free tierのdecided会話(目標確定後)における1日あたりメッセージ上限。
// CoachChatGate(coach feature)とBillingService(billing feature)が同じ値を共有する
// ため、他feature間結合を避けてcommon/helpersに置く(GoalLimit.helperと同じ位置付け)。

export const FREE_DAILY_DECIDED_LIMIT = 3;
