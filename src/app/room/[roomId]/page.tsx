'use client'

import { useParams } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { client } from "@/lib/client";
import { useUsername } from "@/app/hooks/use-username";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import { useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { encryptMessage, decryptMessage, generateRoomKey } from "@/lib/encryption";
import TextType from "@/components/TextType";

function formatTimeRemaining(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function Page() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = useUsername();
    const roomId = (params as any).roomId as string;
    const [input, setInput] = useState("");
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [typingMessages, setTypingMessages] = useState<Set<string>>(new Set());

    // Audio system for beep sounds
    const playBeep = useCallback((frequency: number = 800, duration: number = 100) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        } catch (error) {
            // Silently fail if audio is not supported
        }
    }, []);

    // All hooks must be called before any conditional returns
    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({ text }: { text: string }) => {
            await client.messages.post({ sender: username, text }, { query: { roomId } })
        },
        onSuccess: () => {
            playBeep(1000, 80); // Higher pitch beep for sent message
            setInput("")
        }
    });

    const { data: messages, refetch } = useQuery({
        queryKey: ["messages", roomId],
        queryFn: async () => {
            if (!hasJoined) return { messages: [] };
            const res = await client.messages.get({ query: { roomId } });
            return res.data;
        },
        enabled: hasJoined
    });

    const { data: ttlData } = useQuery({
        queryKey: ['ttl', roomId],
        queryFn: async () => {
            if (!hasJoined) return { ttl: 0 };
            const res = await client.ttl.get({ query: { roomId } });
            return res.data;
        },
        enabled: hasJoined
    });

    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
            await client.delete(null, { query: { roomId } })
        }
    });

    useRealtime({
        channels: hasJoined ? [roomId] : [],
        events: ['chat.message', 'chat.destroy'],
        onData: ({ event }) => {
            if (event === 'chat.message') {
                playBeep(600, 120); // Lower pitch beep for received message
                refetch().then(() => {
                    // Get the updated messages after refetch completes
                    setTimeout(() => {
                        // Trigger a fresh refetch to get the latest data
                        refetch().then((result) => {
                            if (result.data?.messages) {
                                const latestMessage = result.data.messages[result.data.messages.length - 1];
                                if (latestMessage && !typingMessages.has(latestMessage.id) && latestMessage.sender !== username) {
                                    setTypingMessages(prev => new Set(prev).add(latestMessage.id));

                                    // Remove from typing after animation completes
                                    setTimeout(() => {
                                        setTypingMessages(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(latestMessage.id);
                                            return newSet;
                                        });
                                    }, latestMessage.text.length * 30 + 500); // 30ms per character + 500ms buffer
                                }
                            }
                        });
                    }, 100);
                });

                // Auto scroll to bottom when new message arrives
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
            if (event === 'chat.destroy') {
                router.push('/?destroyed=true');
            }
        }
    });

    // Auto scroll to bottom when messages change
    useEffect(() => {
        if (messages?.messages && messages.messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages?.messages?.length]);

    // Join room function
    const joinRoom = async () => {
        console.log('Join room function called');
        setIsJoining(true);
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('x-auth-token='))?.split('=')[1];
            const newToken = token || nanoid();

            console.log('Token exists:', !!token, 'New token:', newToken);

            if (!token) {
                document.cookie = `x-auth-token=${newToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
            }

            const response = await fetch(`/api/rooms/join?roomId=${roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `x-auth-token=${newToken}`
                }
            });

            console.log('Join response status:', response.status);

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 403) {
                    router.push('/?error=room-full');
                } else if (response.status === 404) {
                    router.push('/?error=room_not_found');
                }
                return;
            }

            setHasJoined(true);
        } catch (error) {
            console.error('Connection error:', error);
            router.push('/?error=room_not_found');
        } finally {
            setIsJoining(false);
        }
    };

    // Check if user is already joined on component mount
    useEffect(() => {
        const checkIfAlreadyJoined = async () => {
            const token = document.cookie.split('; ').find(row => row.startsWith('x-auth-token='))?.split('=')[1];

            if (token) {
                try {
                    const response = await fetch(`/api/rooms/join?roomId=${roomId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': `x-auth-token=${token}`
                        }
                    });

                    if (response.ok) {
                        // User is already joined or successfully joined
                        setHasJoined(true);
                    }
                } catch (error) {
                    console.error('Error checking join status:', error);
                }
            }
        };

        checkIfAlreadyJoined();
    }, [roomId]);

    useEffect(() => {
        if (ttlData?.ttl !== undefined) {
            setTimeRemaining(ttlData?.ttl)
        }
    }, [ttlData?.ttl]);

    useEffect(() => {
        if (timeRemaining === null || timeRemaining < 0) {
            return;
        }
        if (timeRemaining === 0) {
            router.push('/?destroyed=true');
            return;
        }
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeRemaining, router]);

    // Copy link function
    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    // Show join room screen if not joined
    if (!hasJoined) {
        return (
            <main className="min-h-screen bg-black text-green-400 font-mono p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Terminal Header */}
                    <div className="border border-green-900/30 bg-black/50 p-3 mb-6">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-500">root@secure-chat:~$</span>
                            <span className="text-zinc-500">./access --node={roomId}</span>
                        </div>
                    </div>

                    {/* Access Terminal */}
                    <div className="border border-green-900/30 bg-black/80 backdrop-blur-sm">
                        <div className="border-b border-green-900/30 p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-500">NODE_ACCESS_TERMINAL</span>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
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
                                    <h1 className="text-lg text-green-400">
                                        <span className="text-green-500">{">"}</span>
                                        NODE_ACCESS_REQUEST
                                    </h1>
                                    <p className="text-zinc-500 text-xs">TARGET: {roomId}</p>
                                </div>

                                <div className="border border-green-900/20 bg-black/50 p-4">
                                    <div className="text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">[NODE_ID]</span>
                                            <span className="text-green-400">{roomId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">[STATUS]</span>
                                            <span className="text-yellow-400">AWAITING_AUTH</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">[TTL]</span>
                                            <span className="text-green-400">600s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">[MAX_NODES]</span>
                                            <span className="text-green-400">2/2</span>
                                        </div>
                                    </div>
                                </div>

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

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-green-500">$</span>
                                        <span>./connect --node={roomId} --auth=token</span>
                                    </div>
                                    <button
                                        onClick={joinRoom}
                                        disabled={isJoining}
                                        className="w-full bg-black border border-green-900/30 text-green-400 p-3 text-sm font-mono hover:bg-green-950/20 hover:border-green-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isJoining ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                                <span>ESTABLISHING_SECURE_CONNECTION...</span>
                                            </div>
                                        ) : (
                                            <span>[CONNECT_TO_NODE]</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="h-screen bg-black text-green-400 font-mono flex flex-col overflow-hidden">
            {/* Terminal Header */}
            <div className="border border-green-900/30 bg-black/50 p-2 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="text-green-500 text-xs sm:text-sm truncate">root@secure-chat:~$ ./session --node={roomId}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-zinc-500 text-xs sm:text-sm">[TTL]</span>
                            <span className={`text-xs sm:text-sm font-mono ${timeRemaining !== null && timeRemaining < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                                {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={copyLink}
                                className="text-xs text-zinc-500 hover:text-green-400 transition-colors border border-green-900/30 px-2 py-1 sm:px-3 sm:py-1 rounded whitespace-nowrap"
                            >
                                {copied ? 'COPIED' : 'COPY'}
                            </button>
                            <button
                                onClick={() => destroyRoom()}
                                className="text-xs text-zinc-500 hover:text-red-400 transition-colors border border-red-900/30 px-2 py-1 sm:px-3 sm:py-1 rounded whitespace-nowrap"
                            >
                                PURGE
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Terminal */}
            <div className="flex-1 border border-green-900/30 bg-black/80 backdrop-blur-sm flex flex-col min-h-0">
                <div className="border-b border-green-900/30 p-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-500">ENCRYPTED_CHANNEL_v2.0.1</span>
                        <span className="text-zinc-600 text-xs">[AES-256-GCM]</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 scrollbar-thin font-mono text-xs sm:text-sm min-h-0">
                    {messages?.messages.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-zinc-600 animate-pulse">[CHANNEL_ACTIVE] Awaiting transmission...</p>
                        </div>
                    )}
                    {messages?.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`
                                ${typingMessages.has(msg.id) ? 'animate-pulse' : ''}
                                transition-opacity duration-200
                            `}
                        >
                            <span className="text-zinc-600">
                                [{format(msg.timestamp, "HH:mm:ss")}]
                            </span>
                            <span className={`ml-2 ${msg.sender === username ? 'text-green-400' : 'text-blue-400'}`}>
                                {msg.sender === username ? 'root' : msg.sender}:
                            </span>
                            <span className={`ml-2 ${msg.sender === username ? 'text-green-300' : 'text-blue-300'}`}>
                                {msg.text}
                            </span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Terminal */}
                <div className="border-t border-green-900/30 p-2 sm:p-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs sm:text-sm">$</span>
                        <input
                            ref={inputRef}
                            placeholder=''
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && input.trim()) {
                                    sendMessage({ text: input });
                                }
                            }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-green-300 text-xs sm:text-sm placeholder:text-zinc-700"
                        />
                        <button
                            onClick={() => {
                                sendMessage({ text: input });
                                inputRef.current?.focus();
                            }}
                            disabled={!input.trim() || isPending}
                            className="text-xs text-zinc-500 hover:text-green-400 transition-colors disabled:opacity-50"
                        >
                            [{isPending ? '...' : 'SEND'}]
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
export default Page