import { HOW_IT_WORKS_HINT, HOW_IT_WORKS_STEPS } from "../config/marketingConfig";

export function HowItWorks() {
	return (
		<section id="how-it-works" className="bg-muted/50 py-16 md:py-24">
			<div className="mx-auto max-w-6xl px-4 md:px-6">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-sm font-semibold text-primary">HOW IT WORKS</p>
					<h2 className="mt-2 text-2xl font-bold md:text-3xl">たった3ステップで、始められます。</h2>
				</div>

				<div className="mt-10 grid gap-8 md:grid-cols-3">
					{HOW_IT_WORKS_STEPS.map((item) => (
						<div key={item.step} className="text-center">
							<div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
								{item.step}
							</div>
							<h3 className="mt-4 font-bold">{item.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
						</div>
					))}
				</div>

				<div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card px-6 py-4 text-center text-sm text-muted-foreground">
					💡 ヒント: {HOW_IT_WORKS_HINT}
				</div>
			</div>
		</section>
	);
}
