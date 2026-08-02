import { createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import {
	CoachChatRateLimitError,
	CoachConversationNotFoundError,
	CoachNotConfiguredError,
	GoalNotFoundError,
	MilestoneNotAdoptedYetError,
	PlanItemAlreadyAdoptedError,
	PlanItemNotFoundError,
} from "../../../common/errors";
import {
	coachAdoptPlanItemSchema,
	coachConversationCreateSchema,
	coachMessageCreateSchema,
} from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { mapConversationToResponse, mapMessageToResponse } from "../helpers/coachChatMapper.helper";
import { CoachModelError } from "../lib/coachModel";
import { CoachChatService } from "../services/coachChatService";

export const coachRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /coach/conversations
coachRoute.post("/conversations", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new CoachChatService(db);

	const parsed = coachConversationCreateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const conversation = await service.startOrGetConversation(userId, parsed.data.goalId);
		return c.json(mapConversationToResponse(conversation));
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// GET /coach/conversations/:id/messages
coachRoute.get("/conversations/:id/messages", async (c) => {
	const userId = c.get("dbUserId");
	const conversationId = c.req.param("id");
	// コントローラはクエリを数値へ変換するのみ。既定値・クランプ等の方針はサービスが持つ
	const cursorParam = c.req.query("cursor");
	const parsedCursor = cursorParam ? Number(cursorParam) : undefined;
	const cursor =
		parsedCursor !== undefined && Number.isFinite(parsedCursor) ? parsedCursor : undefined;
	const limitParam = c.req.query("limit");
	const limit = limitParam !== undefined ? Number(limitParam) : undefined;
	const db = createDb(c.env.DB);
	const service = new CoachChatService(db);

	try {
		const page = await service.getMessages(userId, conversationId, cursor, limit);
		return c.json({
			messages: page.messages.map(mapMessageToResponse),
			nextCursor: page.nextCursor,
		});
	} catch (e) {
		if (e instanceof CoachConversationNotFoundError) {
			return c.json({ message: "Conversation not found" }, 404);
		}
		throw e;
	}
});

// POST /coach/conversations/:id/messages
// AIの返信をSSE(text-delta)としてストリーミングし、末尾でdata-proposalを送る。
// runCoachTurn()内のexecute()はクライアントの読み取り状況と無関係に自走して
// controllerへenqueueするため、永続化(persistTurn)はレスポンス返却をブロックせず
// waitUntilで実行できる。クライアント切断後も確実に完了させるためここに置く。
// エラーはUIMessageStream内でerrorチャンクとして表現されるため、ここでは
// 事前検証(会話の存在・レート制限・API未設定)のみ同期的にハンドリングする。
coachRoute.post("/conversations/:id/messages", async (c) => {
	const userId = c.get("dbUserId");
	const conversationId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new CoachChatService(db);

	const parsed = coachMessageCreateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const { uiStream, persistTurn } = await service.startMessageStream(
			userId,
			conversationId,
			parsed.data.content,
			c.env,
		);

		// turnResultがreject(CoachModelError等)した場合は保存しない。
		// クライアントにはUIMessageStream内のerrorチャンクとして既に伝わっている。
		c.executionCtx.waitUntil(persistTurn().catch(() => undefined));

		return createUIMessageStreamResponse({ stream: uiStream });
	} catch (e) {
		if (e instanceof CoachConversationNotFoundError) {
			return c.json({ message: "Conversation not found" }, 404);
		}
		if (e instanceof CoachChatRateLimitError) {
			return c.json({ message: "Rate limit exceeded" }, 429);
		}
		if (e instanceof CoachNotConfiguredError) {
			return c.json({ message: "Coach chat is not configured" }, 503);
		}
		if (e instanceof CoachModelError) {
			return c.json({ message: "Coach model request failed" }, 502);
		}
		throw e;
	}
});

// POST /coach/messages/:id/adopt-plan-item
coachRoute.post("/messages/:id/adopt-plan-item", async (c) => {
	const userId = c.get("dbUserId");
	const messageId = Number(c.req.param("id"));
	const db = createDb(c.env.DB);
	const service = new CoachChatService(db);

	const parsed = coachAdoptPlanItemSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten() }, 400);
	}

	const target =
		parsed.data.target === "milestone"
			? { type: "milestone" as const }
			: { type: "todo" as const, todoIndex: parsed.data.todoIndex };

	try {
		const result = await service.adoptPlanItem(userId, messageId, target);
		return c.json(result);
	} catch (e) {
		if (e instanceof PlanItemNotFoundError) {
			return c.json({ message: "Plan item not found" }, 404);
		}
		if (e instanceof PlanItemAlreadyAdoptedError) {
			return c.json({ message: "Plan item already adopted" }, 409);
		}
		if (e instanceof MilestoneNotAdoptedYetError) {
			return c.json({ message: "Milestone must be adopted first" }, 409);
		}
		if (e instanceof CoachConversationNotFoundError) {
			return c.json({ message: "Conversation not found" }, 404);
		}
		throw e;
	}
});
