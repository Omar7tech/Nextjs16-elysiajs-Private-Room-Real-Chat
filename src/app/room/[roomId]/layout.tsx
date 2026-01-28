import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { roomId: string } }): Promise<Metadata> {
  const roomId = params.roomId
  
  return {
    title: `Private Chat Room - ${roomId}`,
    description: 'Join this secure, self-destructing private chat room. End-to-end encrypted, auto-deletes after 10 minutes.',
    openGraph: {
      title: `Private Chat Room - ${roomId}`,
      description: 'Join this secure, self-destructing private chat room. End-to-end encrypted, auto-deletes after 10 minutes.',
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.vercel.app'}/room/${roomId}`,
      siteName: 'Private Chat',
      images: [{
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Private Chat Room'
      }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Private Chat Room - ${roomId}`,
      description: 'Join this secure, self-destructing private chat room.',
      images: ['/og-image.png'],
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    }
  }
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
