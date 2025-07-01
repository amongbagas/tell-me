import { pgTable, text, timestamp, boolean, pgEnum, integer, serial, unique } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
        .$defaultFn(() => false)
        .notNull(),
    image: text("image"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()),
});

export const roomStatusEnum = pgEnum("room_status", ["waiting", "active", "closed"]);

export const room = pgTable("room", {
    id: text("id").primaryKey(),
    createdBy: text("created_by").notNull(),
    status: roomStatusEnum("status").default("waiting").notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const participantRoleEnum = pgEnum("participant_role", ["speaker", "listener"]);

export const participant = pgTable(
    "participant",
    {
        id: serial("id").primaryKey(),
        roomId: text("room_id").notNull(),
        uid: integer("uid").notNull(),
        role: participantRoleEnum("role").notNull(),
        isMuted: boolean("is_muted").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        uniqueRoomUid: unique("unique_room_uid").on(table.roomId, table.uid),
    })
);

export const schema = {
    user,
    session,
    account,
    verification,
    room,
    participant,
};
