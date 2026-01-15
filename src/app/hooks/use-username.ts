import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

export const useUsername = () => {
    const ANIMALS = ['cat', 'dog', 'bird', 'mouse', 'rabbit', 'hamster', 'snake'];
    const generateUsername = () => {
      const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
      return `anonymous-${word}-${nanoid(10)}`
    }
    const STORAGE_KEY = 'chat_username';
    const [username, setUsername] = useState("No User Name");
    useEffect(() => {
        const main = () => {
            const storedUsername = localStorage.getItem(STORAGE_KEY);
            if (storedUsername) {
                setUsername(storedUsername)
                
                return;
            }
            const username = generateUsername();
            setUsername(username);
            localStorage.setItem(STORAGE_KEY, username);
        }
        main();
    }, []);

    return username;

}