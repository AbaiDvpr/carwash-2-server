"use client";

import { useState } from "react"

export default function CalcPage() {
    const [number, setNumber] = useState(0);

    const handleIncrement = () => {
        setNumber(number + 1);
    }

    return <>
        <div>
            <p>total: {number}</p>
            <div className="flex gap-2 flex-row">
                <button onClick={handleIncrement} className="w-10 h-10 bg-red-500">+</button>
                <button onClick={() => setNumber(number - 1)} className="w-10 h-10 bg-red-500">-</button>
            </div>
        </div>

    </>
}