// Web Crypto JWT Implementation for Cloudflare Workers (Multi-Tenant & Super Admin)

export interface JwtPayload {
	sub: string; // user id
	userId?: string; // alias for sub
	username?: string;
	email?: string;
	role: string; // 'super_admin' | 'admin' | 'teacher' | 'student_parent'
	isSuperAdmin?: boolean;
	schoolId?: string;
	schoolCode?: string;
	studentId?: string;
	teacherId?: string;
	fullName: string;
	iat: number;
	exp: number;
}

function base64UrlEncode(str: string): string {
	return btoa(str)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
	let output = str.replace(/-/g, "+").replace(/_/g, "/");
	switch (output.length % 4) {
		case 0:
			break;
		case 2:
			output += "==";
			break;
		case 3:
			output += "=";
			break;
		default:
			throw new Error("Illegal base64url string");
	}
	return atob(output);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"]
	);
}

export async function signJwt(
	payload: Omit<JwtPayload, "iat" | "exp">,
	secret: string,
	expiresInSeconds = 86400 * 7
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const fullPayload: JwtPayload = {
		...payload,
		userId: payload.sub,
		iat: now,
		exp: now + expiresInSeconds,
	};

	const header = { alg: "HS256", typ: "JWT" };
	const headerEncoded = base64UrlEncode(JSON.stringify(header));
	const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));

	const data = `${headerEncoded}.${payloadEncoded}`;
	const key = await getHmacKey(secret);
	const encoder = new TextEncoder();
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

	const signatureBytes = new Uint8Array(signature);
	let binary = "";
	for (let i = 0; i < signatureBytes.byteLength; i++) {
		binary += String.fromCharCode(signatureBytes[i]);
	}
	const signatureEncoded = base64UrlEncode(binary);

	return `${data}.${signatureEncoded}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;

		const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
		const data = `${headerEncoded}.${payloadEncoded}`;

		const key = await getHmacKey(secret);
		const encoder = new TextEncoder();

		const sigBinary = base64UrlDecode(signatureEncoded);
		const sigBytes = new Uint8Array(sigBinary.length);
		for (let i = 0; i < sigBinary.length; i++) {
			sigBytes[i] = sigBinary.charCodeAt(i);
		}

		const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
		if (!isValid) return null;

		const payloadJson = base64UrlDecode(payloadEncoded);
		const payload: JwtPayload = JSON.parse(payloadJson);

		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) return null;

		return payload;
	} catch {
		return null;
	}
}
