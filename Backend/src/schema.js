import { pgTable, serial, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  otp: varchar('otp', { length: 6 }),
  otp_expiry: timestamp('otp_expiry', { mode: 'date' }),
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

export const complaints = pgTable('complaints', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  complaint_text: text('complaint_text').notNull(),
  ai_question: text('ai_question').notNull(),
  user_answer: text('user_answer').notNull(),
  created_at: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});
