import { useEffect, useRef, useState } from "react";
import { playSfx } from "@/services/audio";

export const useTidePulse = (tide: number, reduced: boolean): boolean => {
  const prevTide = useRef(tide);
  const prevTideCue = useRef(tide);
  const [tidePulse, setTidePulse] = useState(false);

  useEffect(() => {
    if (tide > prevTideCue.current) {
      playSfx("tideUp", { rate: 1 - Math.min(4, tide) * 0.03 });
    }
    prevTideCue.current = tide;
  }, [tide]);

  useEffect(() => {
    if (tide > prevTide.current && !reduced) {
      setTidePulse(true);
      const id = window.setTimeout(() => {
        setTidePulse(false);
      }, 720);
      prevTide.current = tide;
      return () => {
        window.clearTimeout(id);
      };
    }
    prevTide.current = tide;
  }, [tide, reduced]);

  return tidePulse;
};
