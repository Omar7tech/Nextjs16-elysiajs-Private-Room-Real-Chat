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

const ROOM_TTL_SECONDS = 60 * 10;

const messages = new Elysia({ prefix: '/messages' }).use(authMiddleware).post("/", async ({ body, auth }) => {
    const { sender, text } = body
    const { roomId } = auth
    const roomExists = await redis.exists(`meta:${roomId}`)
    if (!roomExists) {
        throw new Error("Room does not exist")
    }
    const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId
    }

    // add message to history
    await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token })
    await realtime.channel(roomId).emit("chat.message", message)

    //housekeeping

    const remaining = await redis.ttl(`meta:${roomId}`);
    await redis.expire(`messages:${roomId}`, remaining);
    await redis.expire(`history:${roomId}`, remaining);
    await redis.expire(roomId, remaining)
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



export const GET = app.fetch
export const POST = app.fetch

