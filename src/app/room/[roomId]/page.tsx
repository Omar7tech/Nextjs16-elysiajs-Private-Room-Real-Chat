'use client'

import { useParams } from "next/navigation"
import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { client } from "@/lib/client";
import { useUsername } from "@/app/hooks/use-username";

function formatTimeRemaining(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function Page() {
    const params = useParams();
    const username = useUsername();
    const roomId = (params as any).roomId as string;
    const [input, setInput] = useState("");
    const { mutate: sendMessage , isPending } = useMutation({
        mutationFn: async ({ text }: { text: string }) => {
            await client.messages.post({ sender: username, text }, { query: { roomId } })
        }
    })
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);
    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

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
                <button className="text-xs bg-zinc-800 hover:bg-red-600 px-3  py-1.5 rounded text-zinc-400 hover:text-white  font-bold transition-all group flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-zinc-500 cursor-pointer"><span className="group-hover:animate-pulse">💣</span>Destroy Now</button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4  scrollbar-thin">

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