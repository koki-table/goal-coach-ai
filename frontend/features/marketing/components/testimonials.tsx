import { TESTIMONIAL_ITEMS } from "../config/marketingConfig";
import { TestimonialCard } from "./testimonialCard";

export function Testimonials() {
	return (
		<section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-sm font-semibold text-primary">TESTIMONIALS</p>
				<h2 className="mt-2 text-2xl font-bold md:text-3xl">ユーザーの声</h2>
			</div>

			<div className="mt-10 grid gap-4 md:grid-cols-3">
				{TESTIMONIAL_ITEMS.map((testimonial) => (
					<TestimonialCard key={testimonial.quote} testimonial={testimonial} />
				))}
			</div>
		</section>
	);
}
