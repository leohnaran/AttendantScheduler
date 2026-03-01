import { useState } from "react";
// --- UNDO/REDO HOOK ---
export function useUndoRedo(initialState) {
    const [history, setHistory] = useState([initialState]);
    const [index, setIndex] = useState(0);

    const state = history[index];

    const setState = (newState) => {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(newState);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
    };

    const undo = () => index > 0 && setIndex(index - 1);
    const redo = () => index < history.length - 1 && setIndex(index + 1);
    const resetHistory = (newState) => {
        setHistory([newState]);
        setIndex(0);
    };

    return { state, setState, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1, resetHistory };
}
