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
    <main className="min-h-screen bg-black text-green-400 font-mono p-4 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Terminal Header */}
        <div className="border border-green-900/30 bg-black/50 p-3 mb-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-500">root@secure-chat:~$</span>
            <span className="text-zinc-500">./init --mode=ephemeral</span>
          </div>
        </div>

        {/* Alert Messages */}
        {wasDestroyed && 
        <div className="border border-red-900/50 bg-red-950/20 p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-red-500">[ERROR]</span>
            <div>
              <p className="text-red-400 text-sm">SESSION_TERMINATED</p>
              <p className="text-red-600 text-xs mt-1">All data packets have been purged from memory</p>
            </div>
          </div>
        </div>
        }
        {error === 'room_not_found' && 
        <div className="border border-red-900/50 bg-red-950/20 p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-red-500">[404]</span>
            <div>
              <p className="text-red-400 text-sm">NODE_NOT_FOUND</p>
              <p className="text-red-600 text-xs mt-1">Target session does not exist in network</p>
            </div>
          </div>
        </div>
        }
        {error === 'room_full' && 
        <div className="border border-red-900/50 bg-red-950/20 p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-red-500">[503]</span>
            <div>
              <p className="text-red-400 text-sm">CONNECTION_LIMIT_REACHED</p>
              <p className="text-red-600 text-xs mt-1">Maximum node capacity (2) exceeded</p>
            </div>
          </div>
        </div>
        }
        
        {/* Main Terminal */}
        <div className="border border-green-900/30 bg-black/80 backdrop-blur-sm">
          <div className="border-b border-green-900/30 p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-500">SECURE_TERMINAL_v2.0.1</span>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* ASCII Art Title */}
            <div className="text-center space-y-2">
              <pre className="text-green-400 text-xs leading-tight">
{`

 ________  ________  ________   ______   __    __ 
/        |/        |/        | /      \ /  |  /  |
$$$$$$$$/ $$$$$$$$/ $$$$$$$$/ /$$$$$$  |$$ |  $$ |
    /$$/     $$ |   $$ |__    $$ |  $$/ $$ |__$$ |
   /$$/      $$ |   $$    |   $$ |      $$    $$ |
  /$$/       $$ |   $$$$$/    $$ |   __ $$$$$$$$ |
 /$$/        $$ |   $$ |_____ $$ \__/  |$$ |  $$ |
/$$/         $$ |   $$       |$$    $$/ $$ |  $$ |
$$/          $$/    $$$$$$$$/  $$$$$$/  $$/   $$/ 
                                                  
                                                  
                                                  
`}
              </pre>
              <div className="space-y-1">
                <h1 className="text-lg">
                  <span className="text-green-500">{">"}</span>
                  <TextType
                    text={["INIT_SECURE_CHANNEL", "EPHEMERAL_LINK"]}
                    typingSpeed={60}
                    pauseDuration={4000}
                    showCursor={true}
                    cursorCharacter="_"
                  />
                </h1>
                <p className="text-zinc-500 text-xs">[END-TO-END_ENCRYPTED] [AUTO-DESTRUCT: 600s]</p>
              </div>
            </div>

            {/* System Info */}
            <div className="border border-green-900/20 bg-black/50 p-4">
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">[SYSTEM_STATUS]</span>
                  <span className="text-green-400">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">[ENCRYPTION]</span>
                  <span className="text-green-400">AES-256-GCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">[MAX_NODES]</span>
                  <span className="text-green-400">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">[TTL]</span>
                  <span className="text-green-400">600s</span>
                </div>
              </div>
            </div>

            {/* Identity Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-500">$</span>
                <span>whoami</span>
              </div>
              <div className="bg-black border border-green-900/20 p-3">
                <div className="text-xs text-green-400">
                  <span className="text-zinc-500">user@</span>
                  <span className="text-green-300">{username}</span>
                  <span className="text-zinc-500"> [ANONYMOUS_NODE]</span>
                </div>
              </div>
            </div>

            {/* Create Room Command */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-500">$</span>
                <span>./create_session --encrypt=true --ttl=600</span>
              </div>
              <button 
                type="button" 
                onClick={() => createRoom()} 
                disabled={btnDisabled} 
                className="w-full bg-black border border-green-900/30 text-green-400 p-3 text-sm font-mono hover:bg-green-950/20 hover:border-green-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>INITIALIZING_SECURE_CHANNEL...</span>
                  </div>
                ) : (
                  <span>[EXECUTE]</span>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-green-900/20 pt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-600">[CIPHER_SUITE: TLS_1.3]</span>
                <a 
                  href="https://github.com/Omar7tech" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-green-400 transition-colors"
                >
                  dev@Omar7Tech
                </a>
              </div>
            </div>
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
