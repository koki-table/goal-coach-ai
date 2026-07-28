-- 目標値未設定(=1)のKRを 0〜100% スケールへ移行する。
-- 現在値は×100して割合を保持し（例: 0.5/1 → 50/100 = 50%）、単位が空なら"%"を付与する。
-- 実数目標(900点など)を明示設定したKRはtargetValue!=1のため対象外。
UPDATE `milestones`
SET `currentValue` = `currentValue` * 100,
    `targetValue` = 100,
    `unit` = CASE WHEN `unit` = '' THEN '%' ELSE `unit` END
WHERE `targetValue` = 1;
