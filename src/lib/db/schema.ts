import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name'),
	role: text('role', { enum: ['student', 'professor', 'admin'] }).notNull().default('student'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
