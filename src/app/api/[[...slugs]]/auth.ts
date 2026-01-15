import { redis } from "@/lib/redis";
import Elysia from "elysia";

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthError";
    }
}

export const authErrors = {
    roomNotFound: new AuthError("Room not found"),
    roomFull: new AuthError("Room is full"),
    tokenInvalid: new AuthError("Invalid token"),
    tokenExpired: new AuthError("Token expired"),
    tokenMissing: new AuthError("Token missing"),
    tokenAlreadyExists: new AuthError("Token already exists"),
    tokenNotProvided: new AuthError("Token not provided"),
    tokenNotValid: new AuthError("Token not valid"),
    tokenNotValidYet: new AuthError("Token not valid yet"),
    tokenSignatureInvalid: new AuthError("Token signature invalid"),
    tokenSignatureExpired: new AuthError("Token signature expired"),
    tokenSignatureMissing: new AuthError("Token signature missing"),
    tokenSignatureAlreadyExists: new AuthError("Token signature already exists"),
    tokenSignatureNotProvided: new AuthError("Token signature not provided"),
    tokenSignatureNotValid: new AuthError("Token signature not valid"),
    tokenSignatureNotValidYet: new AuthError("Token signature not valid yet"),
};

export const authMiddleware = new Elysia({ name: "auth" })
    .error({ AuthError })
    .onError(({ code, set }) => {
        if (code == "AuthError") {
            set.status = 401;
            return { error: "Unauthorized" }
        }
    })
    .derive({ as: "scoped" }, async ({ query, cookie }) => {
        const roomId = query.roomId
        const token = cookie["x-auth-token"].value as string | undefined
        if (!token || !roomId) {
            throw new AuthError('Missing Room Id Or Token.')
        }
        const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected")
        if (!connected?.includes(token)) {
            throw new AuthError("Invalid Token")
        }
        return {auth : {roomId , token , connected}}
    });