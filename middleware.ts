import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    
    // Simple bot detection for room routes only
    if (pathName.startsWith('/room/')) {
        const userAgent = req.headers.get('user-agent') || '';
        const isBot = userAgent.toLowerCase().includes('whatsapp') || 
                     userAgent.toLowerCase().includes('bot') ||
                     userAgent.toLowerCase().includes('crawler') ||
                     userAgent.toLowerCase().includes('spider');
        
        if (isBot) {
            return new Response('Access denied', { status: 403 })
        }
    }
    
    return NextResponse.next()
}

export const config = {
    matcher: '/room/:path*'
}
