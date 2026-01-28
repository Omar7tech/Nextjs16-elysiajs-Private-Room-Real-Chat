'use client'

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery} from "@tanstack/react-query"
import { client } from "@/lib/client";
import { useUsername } from "@/app/hooks/use-username";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import { useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";

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
    const [copied, setCopied] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // All hooks must be called before any conditional returns
    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({ text }: { text: string }) => {
            await client.messages.post({ sender: username, text }, { query: { roomId } })
        },
        onSuccess: () => {
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
                refetch()
            }
            if (event === 'chat.destroy') {
                router.push('/?destroyed=true');
            }
        }
    });

    // Join room function
    const joinRoom = async () => {
        setIsJoining(true);
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('x-auth-token='))?.split('=')[1];
            const newToken = token || nanoid();
            
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
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-green-500">{">"} Private Chat Room</h1>
                        <p className="text-zinc-500 text-sm">Room ID: <span className="font-mono text-green-400">{roomId}</span></p>
                        <p className="text-zinc-600 text-xs">This room will self-destruct in 10 minutes</p>
                    </div>

                    <div className="border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center text-zinc-500">Your Identity</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-zinc-950 border border-zinc-800 text-sm text-zinc-400 font-mono p-2">
                                        {username}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={joinRoom}
                                disabled={isJoining}
                                className="gap-3 flex justify-center items-center w-full bg-zinc-100 text-zinc-950 p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isJoining ? 'Joining...' : 'Join Room'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex flex-col h-screen max-h-screen overflow-hidden">
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase">Room Id</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-green-500 ">{roomId}</span>
                            <button onClick={copyLink} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer uppercase">{copied ? 'Copied!' : 'Copy'}</button>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-zinc-800" />
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-zinc-500 uppercase">Self-Destruct <span className={`text-sm font-bold flex items-center gap-2 ${timeRemaining !== null && timeRemaining < 60 ? 'text-red-500' : 'text-amber-500'}`}>{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}</span></span>
                    </div>
                </div>
                <button onClick={() => {
                    destroyRoom()
                }} className="text-xs bg-zinc-800 hover:bg-red-600 px-3  py-1.5 rounded text-zinc-400 hover:text-white  font-bold transition-all group flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-zinc-500 cursor-pointer"><span className="group-hover:animate-pulse">💣</span>Destroy Now</button>
            </header>
            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4  scrollbar-thin">
                {messages?.messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-zinc-600 text-sm font-mono">No messages yet , start the conversation</p>
                    </div>
                )}
                {messages?.messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-start">

                        <div className="max-w-[80%] group">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className={`text-xs font-bold ${msg.sender === username ? 'text-green-500' : 'text-blue-500'}`}>{msg.sender === username ? 'YOU' : msg.sender}</span>
                                <span className="text-[10px] text-zinc-600">{format(msg.timestamp , "HH:mm") }</span>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed break-all">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4  border-t border-zinc-800 bg-zinc-900/30">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <span className="absolute left-4  top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:animate-pulse group-focus-within:text-green-500">{">"}</span>
                        <input placeholder='Type your message...' onKeyDown={(e) => {
                            if (e.key === "Enter" && input.trim()) {
                                sendMessage({ text: input });
                                inputRef.current?.focus();

                            }
                        }} value={input} onChange={(e) => setInput(e.target.value)} type="text" className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transitions-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm" />
                    </div>
                    <button onClick={() => {
                        sendMessage({ text: input })
                        inputRef.current?.focus()
                    }
                    } disabled={!input.trim() || isPending} className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase">SEND</button>
                </div>
            </div>
        </main>
    )
}

export default Page