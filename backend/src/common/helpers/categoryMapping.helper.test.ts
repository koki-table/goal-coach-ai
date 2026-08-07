import { describe, expect, it } from "vitest";
import { getCategoryKeyFromName, getCategoryNameFromKey } from "./categoryMapping.helper";

describe("categoryMapping helper", () => {
	describe("getCategoryNameFromKey", () => {
		it("maps study to 学習", () => {
			expect(getCategoryNameFromKey("study")).toBe("学習");
		});

		it("maps career to 仕事", () => {
			expect(getCategoryNameFromKey("career")).toBe("仕事");
		});

		it("maps health to 健康", () => {
			expect(getCategoryNameFromKey("health")).toBe("健康");
		});

		it("maps skill to スキル", () => {
			expect(getCategoryNameFromKey("skill")).toBe("スキル");
		});

		it("maps finance to 財務", () => {
			expect(getCategoryNameFromKey("finance")).toBe("財務");
		});

		it("maps other to その他", () => {
			expect(getCategoryNameFromKey("other")).toBe("その他");
		});
	});

	describe("getCategoryKeyFromName", () => {
		it("maps 学習 to study", () => {
			expect(getCategoryKeyFromName("学習")).toBe("study");
		});

		it("maps 仕事 to career", () => {
			expect(getCategoryKeyFromName("仕事")).toBe("career");
		});

		it("returns other for unknown names", () => {
			expect(getCategoryKeyFromName("unknown")).toBe("other");
		});
	});
});
