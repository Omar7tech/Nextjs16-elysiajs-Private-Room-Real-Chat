import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

function isBot(req: NextRequest): boolean {
    const userAgent = req.headers.get('user-agent') || '';
    const botPatterns = [
        'whatsapp',
        'facebookexternalhit',
        'twitterbot',
        'linkedinbot',
        'telegrambot',
        'slackbot',
        'discordbot',
        'googlebot',
        'bingbot',
        'slurp',
        'duckduckbot',
        'baiduspider',
        'yandexbot',
        'crawler',
        'spider',
        'bot'
    ];
    
    return botPatterns.some(pattern => 
        userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
}

export async function middleware(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    const roomMatch = pathName.match(/^\/room\/([^/]+)$/)
    if(!roomMatch) {
        return NextResponse.next()
    }
    
    // Skip connection logic for bots - just let them see the page for metadata
    if (isBot(req)) {
        return NextResponse.next()
    }
    
    const roomId  = roomMatch[1]
    const meta = await redis.hgetall<{connected: string[] , createdAt : number}>(`meta:${roomId}`)
    if(!meta){
        return NextResponse.redirect(new URL('/?error=room_not_found', req.url))
    }
    const existingToken = req.cookies.get('x-auth-token')?.value
    const connectedUsers = Array.isArray(meta.connected) ? meta.connected : []
    if(existingToken && connectedUsers.includes(existingToken)) {
        return NextResponse.next()
    }
    if(connectedUsers.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }
    const response = NextResponse.next()
    const token  = existingToken || nanoid();
    response.cookies.set('x-auth-token', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
    })
    await redis.hset(`meta:${roomId}`, {
            connected: [...connectedUsers, token]
    })
    return response
}

export const config = {
    matcher: '/room/:path*'
}
