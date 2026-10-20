import { eq } from "drizzle-orm";
import { Database } from "../db";
import { users, schoolSettings } from "../db/schema";

export async function generateNextUsername(db: Database, schoolId: string): Promise<string> {
	const settings = await db
		.select()
		.from(schoolSettings)
		.where(eq(schoolSettings.schoolId, schoolId))
		.limit(1);

	let prefix = "Alpha";
	let counter = 1933;

	if (settings.length > 0) {
		prefix = settings[0].usernamePrefix || "Alpha";
		counter = settings[0].usernameCounter || 1933;
	}

	let proposedUsername = `${prefix}${counter}`;
	let exists = true;

	while (exists) {
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, proposedUsername))
			.limit(1);

		if (existingUser.length === 0) {
			exists = false;
		} else {
			counter++;
			proposedUsername = `${prefix}${counter}`;
		}
	}

	// Update counter in schoolSettings
	if (settings.length > 0) {
		await db
			.update(schoolSettings)
			.set({ usernameCounter: counter + 1 })
			.where(eq(schoolSettings.schoolId, schoolId));
	}

	return proposedUsername;
}
