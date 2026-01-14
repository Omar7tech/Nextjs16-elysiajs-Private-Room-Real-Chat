'use client'
import TextType from "@/components/TextType";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const ANIMALS = ['cat', 'dog', 'bird', 'mouse', 'rabbit', 'hamster', 'snake'];

const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `anonymous-${word}-${nanoid(10)}`
}

const STORAGE_KEY = 'chat_username';

export default function Home() {
  const [username, setUsername] = useState("No User Name");
  const [btnDisabled, setBtnDisabled] = useState(true);
  useEffect(() => {
    const main = () => {
      const storedUsername = localStorage.getItem(STORAGE_KEY);
      if (storedUsername) {
        setUsername(storedUsername)
        setBtnDisabled(false)
        return;
      }

      const username = generateUsername();
      setUsername(username);
      localStorage.setItem(STORAGE_KEY, username);
      setBtnDisabled(false);
    }
    main();
  }, []);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">{">"}
            <TextType
              text={["private_chat","self-destructing_chat"]}
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
            <button disabled={btnDisabled} className="w-full bg-zinc-100 text-zinc-950 p-3  text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Create Secure Room</button>
          </div>
        </div>
      </div>
    </main>
  );
}
