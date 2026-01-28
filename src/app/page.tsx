'use client'
import TextType from "@/components/TextType";
import Spinner from "@/components/ui/spinner";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useUsername } from "./hooks/use-username";
import { useSearchParams } from "next/navigation";


function HomeContent() {
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const username = useUsername();
  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get('destroyed') === 'true';
  const error = searchParams.get('error');
  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      setBtnDisabled(true);
      const res = await client.rooms.create.post();
      if (res.status === 200) {
        // Create token for room creator and add them immediately
        const token = nanoid();
        document.cookie = `x-auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        
        // Add creator to room immediately
        await fetch(`/api/rooms/join?roomId=${res.data?.roomId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `x-auth-token=${token}`
          }
        });
        
        router.push(`/room/${res.data?.roomId}`)
      }
      setIsLoading(false);
      setBtnDisabled(false);
    }
  })
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {wasDestroyed && 
        <div className="bg-red-950/50 p-6">
          <p className="uppercase text-red-500 text-sm font-bold">Room Destroyed</p>
          <p className="text-zinc-500 text-xs">All messages were permanently deleted.</p>
        </div>
        }
        {error === 'room_not_found' && 
        <div className="bg-red-950/50 p-6">
          <p className="uppercase text-red-500 text-sm font-bold">Room Not Found</p>
          <p className="text-zinc-500 text-xs">This room may have been deleted or does not exist.</p>
        </div>
        }
        {error === 'room-full' && 
        <div className="bg-red-950/50 p-6">
          <p className="uppercase text-red-500 text-sm font-bold">Room Full</p>
          <p className="text-zinc-500 text-xs">This room is full and cannot accept any more participants.</p>
        </div>
        }
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">{">"}
            <TextType
              text={["private_chat", "self-destructing_chat"]}
              typingSpeed={75}
              pauseDuration={5000}
              showCursor={true}
              cursorCharacter="|"
            /></h1>
          <p className="text-zinc-500 text-sm">A private , self-distructing chat room.</p>
        </div>

        <div className="border-zinc-800 bg-zinc-90 0/50 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500">Your Identity</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-950 border border-zinc-800 text-sm text-zinc-400 font-mono p-2">
                  {username}
                </div>
              </div>

            </div>
            <button type="button" onClick={() => createRoom()} disabled={btnDisabled} className="gap-3 flex justify-center items-center w-full bg-zinc-100 text-zinc-950 p-3  text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading && (
                <Spinner />
              )}
              <span>
                Create Secure Room
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen flex-col items-center justify-center p-4"><div className="text-zinc-500">Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}
