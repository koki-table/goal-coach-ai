// Vitest setup file
// DOM matchers from @testing-library/jest-dom are configured here
// when component tests are added.
import "@testing-library/jest-dom/vitest";

// jsdomはwindow.matchMediaを実装していないため、useMediaQuery等が使えるようにモックする。
// デフォルトはmatches:falseで、必要なテストはvi.spyOnで個別に上書きする。
if (!window.matchMedia) {
	window.matchMedia = (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});
}
