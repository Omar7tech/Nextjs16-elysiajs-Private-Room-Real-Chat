import { treaty } from '@elysiajs/eden'
import { Elysia, t } from 'elysia'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { connected } from 'process'

const ROOM_TTL_SECONDS = 60 * 10;
export const app = new Elysia({ prefix: '/api' })
    .post('/rooms/create', async () => {
        const roomId = nanoid(15);
        await redis.hset(`meta:${roomId}` , {
            connected: 0,
            createdAt: Date.now(),
        });
        await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);
        return { roomId }
    })

export const GET = app.fetch
export const POST = app.fetch