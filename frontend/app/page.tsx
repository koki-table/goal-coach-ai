import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
				<p className="text-muted-foreground">目標達成状況の概要を確認できます。</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{/* 達成確率カード */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>今月の達成確率</CardDescription>
						<CardTitle className="text-3xl font-bold text-primary">72%</CardTitle>
					</CardHeader>
					<CardContent>
						<Progress value={72} className="h-2" />
						<p className="mt-2 text-xs text-muted-foreground">先月比 +5%</p>
					</CardContent>
				</Card>

				{/* 進行中目標カード */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>進行中の目標</CardDescription>
						<CardTitle className="text-3xl font-bold">3</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Badge variant="secondary">学習</Badge>
							<Badge variant="secondary">健康</Badge>
							<Badge variant="secondary">キャリア</Badge>
						</div>
					</CardContent>
				</Card>

				{/* 本日のToDoカード */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>本日のToDo</CardDescription>
						<CardTitle className="text-3xl font-bold">5 / 8</CardTitle>
					</CardHeader>
					<CardContent>
						<Progress value={62.5} className="h-2" />
						<p className="mt-2 text-xs text-muted-foreground">残り3タスク</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
