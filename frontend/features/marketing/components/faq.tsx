import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/atom/accordion";
import { FAQ_ITEMS } from "../config/marketingConfig";

export function Faq() {
	return (
		<section id="faq" className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
			<div className="text-center">
				<p className="text-sm font-semibold text-primary">FAQ</p>
				<h2 className="mt-2 text-2xl font-bold md:text-3xl">よくあるご質問</h2>
			</div>

			<Accordion className="mt-10">
				{FAQ_ITEMS.map((item) => (
					<AccordionItem key={item.question} value={item.question}>
						<AccordionTrigger>{item.question}</AccordionTrigger>
						<AccordionContent>{item.answer}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
}
