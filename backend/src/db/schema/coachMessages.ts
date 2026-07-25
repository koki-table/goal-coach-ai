import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { coachConversations } from "./coachConversations";
import { coachMessageRoles } from "./constants";

export const coachMessages = sqliteTable(
	"coach_messages",
	{
		// 他テーブルはUUID text PKだが、カーソルページネーション(where id < cursor order by id desc)
		// の正確な順序保証のため本テーブルのみinteger autoincrementを使う(意図的な規約差異)
		id: integer("id").primaryKey({ autoIncrement: true }),
		conversationId: text("conversationId")
			.notNull()
			.references(() => coachConversations.id, { onDelete: "cascade" }),
		role: text("role", { enum: coachMessageRoles }).notNull(),
		content: text("content").notNull(),
		// 提案(nullable JSON)。採用時にadopted:true, createdXxxIdを書き込んで更新する
		proposal: text("proposal"),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [index("idx_coach_messages_conversation_id").on(table.conversationId, table.id)],
);
