export type CoachEpisode = {
	createdAt: string;
	progressPercent: number;
	memo: string | null;
	obstacles: string | null;
	feedback: string;
};

export type CoachEpisodeSummary = {
	episodeCount: number;
	isStagnant: boolean;
	progressDeltaSinceOldest: number;
};

// 直近エピソードから停滞状況を決定的に算出する（AIコール不要）。
// 過去の全エピソードでprogressPercentが変化していなければ停滞と判定する。
export function summarizeEpisodes(episodes: CoachEpisode[]): CoachEpisodeSummary {
	if (episodes.length === 0) {
		return { episodeCount: 0, isStagnant: false, progressDeltaSinceOldest: 0 };
	}

	const oldest = episodes[episodes.length - 1];
	const newest = episodes[0];
	const progressDeltaSinceOldest = newest.progressPercent - oldest.progressPercent;

	return {
		episodeCount: episodes.length,
		isStagnant: episodes.length >= 2 && progressDeltaSinceOldest === 0,
		progressDeltaSinceOldest,
	};
}
