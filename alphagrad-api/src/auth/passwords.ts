// Web Crypto PBKDF2 Password Hashing & Verification

const ITERATIONS = 100_000;
const KEY_LEN = 32; // 256 bits

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	const encoder = new TextEncoder();
	const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: ITERATIONS,
			hash: "SHA-256",
		},
		baseKey,
		KEY_LEN * 8
	);

	const hashHex = Array.from(new Uint8Array(derivedBits))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return `pbkdf2:${ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	try {
		const parts = storedHash.split(":");
		if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

		const iterations = parseInt(parts[1], 10);
		const saltHex = parts[2];
		const expectedHashHex = parts[3];

		const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

		const encoder = new TextEncoder();
		const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);

		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: "PBKDF2",
				salt: salt,
				iterations: iterations,
				hash: "SHA-256",
			},
			baseKey,
			KEY_LEN * 8
		);

		const derivedHashHex = Array.from(new Uint8Array(derivedBits))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		// Constant-time string comparison
		if (derivedHashHex.length !== expectedHashHex.length) return false;
		let diff = 0;
		for (let i = 0; i < derivedHashHex.length; i++) {
			diff |= derivedHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
		}
		return diff === 0;
	} catch {
		return false;
	}
}

export function generateSchoolPassword(prefix = "Alpha"): string {
	const specialChars = ["@", "#", "$", "!"];
	const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
	const randomDigits = Math.floor(1000 + Math.random() * 9000);
	return `${prefix}${randomSpecial}${randomDigits}`;
}

export const generateProventusPassword = generateSchoolPassword;
