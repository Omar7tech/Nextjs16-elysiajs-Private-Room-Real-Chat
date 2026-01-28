import { treaty } from '@elysiajs/eden'
import { Elysia, t } from 'elysia'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { connected } from 'process'
import { openapi } from '@elysiajs/openapi'
import { authMiddleware } from './auth'
import { z } from "zod";
import { text } from 'stream/consumers'
import { Message, realtime } from '@/lib/realtime'
import { encryptMessage, decryptMessage, generateRoomKey } from '@/lib/encryption'

const ROOM_TTL_SECONDS = 60 * 10;

const messages = new Elysia({ prefix: '/messages' }).use(authMiddleware)
    .get("/", async ({ auth }) => {
        const messages = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1)
        const roomKey = generateRoomKey(auth.roomId)
        
        return {
            messages: messages.map((m) => {
                try {
                    const decryptedText = decryptMessage(m.text, roomKey)
                    return {
                        ...m,
                        text: decryptedText,
                        token: m.token === auth.token ? auth.token : undefined
                    }
                } catch (error) {
                    // If decryption fails, return original text (for backward compatibility)
                    return {
                        ...m,
                        token: m.token === auth.token ? auth.token : undefined
                    }
                }
            })
        }
    }, {
        query: z.object({
            roomId: z.string()
        })
    })

    .post("/", async ({ body, auth, set }) => {
        const { sender, text } = body

        const { roomId } = auth

        const roomExists = await redis.exists(`meta:${roomId}`)

        if (!roomExists) {
            set.status = 404;
            return { error: "Room does not exist" }
        }

        const roomKey = generateRoomKey(roomId)
        const encryptedText = encryptMessage(text, roomKey)

        const message: Message = {
            id: nanoid(),
            sender,
            text: encryptedText, // Store encrypted text
            timestamp: Date.now(),
            roomId
        }

        await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token })
        
        // Send decrypted message to clients (they'll encrypt/decrypt on their end)
        const messageForClients = {
            ...message,
            text: text // Send original text to clients
        }
        await realtime.channel(roomId).emit("chat.message", messageForClients)

        return message
    }, {
        query: z.object({
            roomId: z.string()
        }),
        body: z.object({
            sender: z.string().max(100),
            text: z.string().max(1000)
        })
    })
export const app = new Elysia({ prefix: '/api' })
    .use
    (openapi
        ())
    .use(messages)
    .post('/rooms/create', async () => {
        const roomId = nanoid(25);
        await redis.hset(`meta:${roomId}`, {
            connected: 0,
            createdAt: Date.now(),
        });
        await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);
        return { roomId }
    })
    .post('/rooms/join', async ({ query, cookie, set }) => {
        const roomId = query.roomId as string;
        const token = cookie['x-auth-token']?.value;
        
        console.log('Join attempt - RoomID:', roomId, 'Token:', token, 'User-Agent:', cookie['user-agent']);
        
        if (!roomId || !token) {
            set.status = 400;
            return { error: 'Missing roomId or token' };
        }
        
        const meta = await redis.hgetall(`meta:${roomId}`);
        if (!meta) {
            set.status = 404;
            return { error: 'Room not found' };
        }
        
        const connectedUsers = meta.connected ? (Array.isArray(meta.connected) ? meta.connected : [meta.connected]) : [];
        console.log('Current connected users:', connectedUsers);
        
        if (connectedUsers.includes(token)) {
            console.log('User already connected');
            return { success: true };
        }
        
        if (connectedUsers.length >= 2) {
            console.log('Room full, rejecting');
            set.status = 403;
            return { error: 'Room is full' };
        }
        
        await redis.hset(`meta:${roomId}`, {
            connected: [...connectedUsers, token]
        });
        
        console.log('User added, new connected users:', [...connectedUsers, token]);
        return { success: true };
    }, {
        query: t.Object({
            roomId: t.String()
        })
    })
    .get('/ttl', async ({ query, set }) => {
        const roomId = query.roomId as string;
        if (!roomId) {
            set.status = 400;
            return { error: 'Missing roomId' };
        }
        
        const ttl = await redis.ttl(`meta:${roomId}`)
        return { ttl: ttl > 0 ? ttl : 0 }
    }, {
        query: t.Object({
            roomId: t.String()
        })
    })
    .use(authMiddleware)
    .delete("/", async ({ auth }) => {
        await realtime.channel(auth.roomId).emit("chat.destroy", { isDestroyed: true })
        await Promise.all([
            redis.del(auth.roomId),
            redis.del(`meta:${auth.roomId}`),
            redis.del(`messages:${auth.roomId}`)
        ])
    }, {
        query: z.object({
            roomId: z.string()
        })
    })



export const GET = app.fetch
export const POST = app.fetch
export const DELETE = app.fetch

