import { FEATURE_ITEMS } from "../config/marketingConfig";
import { FeatureCard } from "./featureCard";

export function FeatureGrid() {
	return (
		<section id="features" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-sm font-semibold text-primary">FEATURES</p>
				<h2 className="mt-2 text-2xl font-bold md:text-3xl">パワフルな機能で、目標達成を加速。</h2>
				<p className="mt-3 text-muted-foreground">
					ペンタ君は、目標を分解して伴走するために必要な機能をすべて備えています。
				</p>
			</div>

			<div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				{FEATURE_ITEMS.map((feature) => (
					<FeatureCard key={feature.title} feature={feature} />
				))}
			</div>
		</section>
	);
}
