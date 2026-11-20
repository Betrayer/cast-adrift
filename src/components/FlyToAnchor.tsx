import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { fireMotionFlag, MOTION_MS, POP_MS, reducedNow } from "@/app/motion";
import { flyPath, landingTransform, type FlyBox } from "@/components/flyPath";

const FLY_MS = MOTION_MS.l;

const FLY_FUSE_MS = MOTION_MS.xs;

const FLY_END_OPACITY = 0.2;

const FLY_LANDED_ATTRIBUTE = "data-fly-landed";

const FLY_TRANSITION =
  "transform var(--ca-motion-l) var(--ca-ease-back), opacity var(--ca-motion-xs) linear calc(var(--ca-motion-l) - var(--ca-motion-xs))";

const STRIPPED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "id",
  "name",
  "for",
  "tabindex",
  "data-testid",
  "data-coach",
  "data-rise",
  "data-press",
  "data-pop",
  "data-sweep",
  "data-sweep-host",
  "data-entry-flourish",
]);

const FLIGHT_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: "var(--z-overlay)",
  pointerEvents: "none",
  transformOrigin: "50% 50%",
  margin: 0,
  willChange: "transform, opacity",
};

export interface FlyRequest {
  source: HTMLElement | null | undefined;
  target: Element | null | undefined;
  kind: string;
}

interface Flight {
  id: number;
  kind: string;
  clone: HTMLElement;
  frame: FlyBox;
  landing: string;
  target: Element;
}

const stripHooks = (root: Element): void => {
  for (const node of [root, ...root.querySelectorAll("*")]) {
    for (const name of node.getAttributeNames()) {
      if (STRIPPED_ATTRIBUTES.has(name)) node.removeAttribute(name);
    }
  }
};

const cloneForFlight = (source: HTMLElement): HTMLElement => {
  const clone = source.cloneNode(true) as HTMLElement;
  stripHooks(clone);
  clone.style.width = "100%";
  clone.style.height = "100%";
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  clone.style.opacity = "1";
  clone.style.animation = "none";
  clone.style.transform = "none";
  return clone;
};

const flightFor = (id: number, request: FlyRequest): Flight | null => {
  const { source, target, kind } = request;
  if (source === null || source === undefined) return null;
  if (target === null || target === undefined) return null;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return null;
  if (to.width === 0 && to.height === 0) return null;
  const size = {
    width: source.offsetWidth > 0 ? source.offsetWidth : from.width,
    height: source.offsetHeight > 0 ? source.offsetHeight : from.height,
  };
  const path = flyPath(from, size, to);
  return {
    id,
    kind,
    clone: cloneForFlight(source),
    frame: path.frame,
    landing: landingTransform(path),
    target,
  };
};

interface FlightViewProps {
  flight: Flight;
  onLanded: (flight: Flight) => void;
}

const FlightView = ({ flight, onLanded }: FlightViewProps) => {
  const host = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = host.current;
    if (node === null) return;
    node.replaceChildren(flight.clone);
    node.style.transition = "none";
    node.style.transform = "none";
    node.style.opacity = "1";
    void node.offsetWidth;
    node.style.transition = FLY_TRANSITION;
    node.style.transform = flight.landing;
    node.style.opacity = String(FLY_END_OPACITY);
    let landed = false;
    const land = (): void => {
      if (landed) return;
      landed = true;
      onLanded(flight);
    };
    const onEnd = (event: TransitionEvent): void => {
      if (event.target === node && event.propertyName === "transform") land();
    };
    node.addEventListener("transitionend", onEnd);
    const fuse = window.setTimeout(land, FLY_MS + FLY_FUSE_MS);
    return () => {
      landed = true;
      node.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fuse);
    };
  }, [flight, onLanded]);

  return (
    <div
      ref={host}
      data-fly={flight.kind}
      aria-hidden="true"
      inert
      style={{
        ...FLIGHT_STYLE,
        left: flight.frame.left,
        top: flight.frame.top,
        width: flight.frame.width,
        height: flight.frame.height,
      }}
    />
  );
};

interface FlyToAnchorProps {
  flights: readonly Flight[];
  onLanded: (flight: Flight) => void;
}

const FlyToAnchor = ({ flights, onLanded }: FlyToAnchorProps) =>
  flights.length === 0
    ? null
    : createPortal(
        flights.map((flight) => (
          <FlightView key={flight.id} flight={flight} onLanded={onLanded} />
        )),
        document.body,
      );

export interface FlyToAnchorHandle {
  fly: (request: FlyRequest) => void;
  layer: ReactNode;
}

export const useFlyToAnchor = (): FlyToAnchorHandle => {
  const [flights, setFlights] = useState<readonly Flight[]>([]);
  const sequence = useRef(0);

  const fly = useCallback((request: FlyRequest): void => {
    if (reducedNow()) return;
    sequence.current += 1;
    const flight = flightFor(sequence.current, request);
    if (flight === null) return;
    setFlights((current) => [...current, flight]);
  }, []);

  const onLanded = useCallback((flight: Flight): void => {
    const landed = Number(flight.target.getAttribute(FLY_LANDED_ATTRIBUTE) ?? "0");
    flight.target.setAttribute(FLY_LANDED_ATTRIBUTE, String(landed + 1));
    fireMotionFlag(flight.target, "data-pop", POP_MS);
    setFlights((current) => current.filter((entry) => entry.id !== flight.id));
  }, []);

  return {
    fly,
    layer: <FlyToAnchor flights={flights} onLanded={onLanded} />,
  };
};
