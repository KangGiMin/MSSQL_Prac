import { useCallback, useEffect, useRef, useState } from "react";
import { timing } from "../config/workbench";

export function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), timing.toastMs);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, notify];
}
