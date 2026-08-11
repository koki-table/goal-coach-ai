import { and, desc, eq, lt } from "drizzle-orm";
import type { Database } from "../../db";
import { coachMessages } from "../../db/schema";
import type { CoachMessageRole } from "../../db/schema";

export class CoachMessageRepository {
	constructor(private db: Database) {}

	async create(data: {
		conversationId: string;
		role: CoachMessageRole;
		content: string;
		proposal?: string | null;
		model?: string | null;
	}) {
		return this.db.insert(coachMessages).values(data).returning().get();
	}

	// カーソルページネーション: cursor未指定時は最新からlimit件、指定時はid<cursorをdesc取得。
	// idはautoincrementのため時系列とid順序が完全一致し、カーソルの正確性が保証される。
	async findPageByConversationId(
		conversationId: string,
		cursor: number | undefined,
		limit: number,
	) {
		const condition =
			cursor !== undefined
				? and(eq(coachMessages.conversationId, conversationId), lt(coachMessages.id, cursor))
				: eq(coachMessages.conversationId, conversationId);

		const rows = await this.db
			.select()
			.from(coachMessages)
			.where(condition)
			.orderBy(desc(coachMessages.id))
			.limit(limit + 1)
			.all();

		const hasMore = rows.length > limit;
		const page = hasMore ? rows.slice(0, limit) : rows;
		const messages = page.reverse();

		return { messages, nextCursor: hasMore ? page[0].id : undefined };
	}

	// Geminiへの直近履歴渡し用（時系列昇順）
	async findRecentByConversationId(conversationId: string, limit: number) {
		const rows = await this.db
			.select()
			.from(coachMessages)
			.where(eq(coachMessages.conversationId, conversationId))
			.orderBy(desc(coachMessages.id))
			.limit(limit)
			.all();
		return rows.reverse();
	}

	async findById(id: number) {
		return this.db.select().from(coachMessages).where(eq(coachMessages.id, id)).get();
	}

	async updateProposal(id: number, proposal: string) {
		return this.db
			.update(coachMessages)
			.set({ proposal })
			.where(eq(coachMessages.id, id))
			.returning()
			.get();
	}

	// db.batch() 用のステートメント（実行しない）
	insertStmt(data: {
		conversationId: string;
		role: CoachMessageRole;
		content: string;
		proposal?: string | null;
		model?: string | null;
	}) {
		return this.db.insert(coachMessages).values(data);
	}

	// db.batch() 用のステートメント（実行しない）
	updateProposalStmt(id: number, proposal: string) {
		return this.db.update(coachMessages).set({ proposal }).where(eq(coachMessages.id, id));
	}
}
