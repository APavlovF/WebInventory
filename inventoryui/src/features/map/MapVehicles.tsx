// src/features/map/MapVehicles.tsx
import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

export interface Point {
    x: number;
    y: number;
}

interface MapVehiclesProps {
    truckRoutePoints: Point[];
    carCircuitPoints: Point[];
}

type IsoDirection = 'SE' | 'SW' | 'NE' | 'NW';

// 1. CALCULATE CONSTANT-SPEED KEYFRAME TIMINGS
// Prevents speeding up on straightaways and slowing down on curves
function buildSmoothKeyframes(points: Point[], offsetX: number, offsetY: number) {
    if (points.length === 0) return { x: [], y: [], times: [] };
    if (points.length === 1) return { x: [points[0].x + offsetX], y: [points[0].y + offsetY], times: [0] };

    const distances: number[] = [0];
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
        const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        totalDistance += d;
        distances.push(totalDistance);
    }

    const times = distances.map((d) => (totalDistance > 0 ? d / totalDistance : 0));

    return {
        x: points.map((p) => p.x + offsetX),
        y: points.map((p) => p.y + offsetY),
        times,
    };
}

// 2. SCREEN-SPACE QUADRANT MAPPING
function getIsoDirection(dx: number, dy: number, current: IsoDirection): IsoDirection {
    if (Math.hypot(dx, dy) < 0.05) return current; // Ignore microscopic sub-pixel jitter

    if (dx >= 0 && dy >= 0) return 'SE'; // Screen Down-Right
    if (dx < 0 && dy >= 0) return 'SW';  // Screen Down-Left
    if (dx >= 0 && dy < 0) return 'NE';  // Screen Up-Right
    return 'NW';                         // Screen Up-Left
}

// 3. SVG FLIPPING & FRONT/REAR VISIBILITY
// Base SVG artwork faces SW (Down-Left)
function getOrientationFlags(direction: IsoDirection) {
    switch (direction) {
        case 'SW': // Moving Down-Left: Front visible, original orientation
            return { isFlipped: false, isRear: false };
        case 'SE': // Moving Down-Right: Front visible, mirrored horizontally
            return { isFlipped: true, isRear: false };
        case 'NE': // Moving Up-Right: Rear visible, original orientation
            return { isFlipped: false, isRear: true };
        case 'NW': // Moving Up-Left: Rear visible, mirrored horizontally
            return { isFlipped: true, isRear: true };
    }
}

// --- DYNAMIC VECTOR CAR ---
function VectorCar({ direction }: { direction: IsoDirection }) {
    const { isFlipped, isRear } = getOrientationFlags(direction);

    return (
        <svg
            viewBox="0 0 64 64"
            style={{
                width: '100%',
                height: '100%',
                transform: isFlipped ? 'scaleX(-1)' : 'none',
                filter: 'drop-shadow(0 3px 6px rgba(14, 165, 233, 0.5))',
            }}
        >
            <g stroke="#1e40af" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
                {/* Main Lower Body */}
                <polygon points="8,36 26,48 56,31 38,19" fill="#dbeafe" />
                <polygon points="8,36 26,48 26,55 8,43" fill="#bfdbfe" />
                <polygon points="26,48 56,31 56,38 26,55" fill="#93c5fd" />

                {/* Cabin / Roof */}
                <polygon points="18,28 31,37 48,27 35,18" fill="#eff6ff" />
                <polygon points="18,28 31,37 26,48 8,36" fill="#bfdbfe" />
                <polygon points="31,37 48,27 56,31 26,48" fill="#93c5fd" />

                {/* Windshield / Rear Window */}
                <polygon
                    points="13,34 25,42 30,36 19,29"
                    fill={isRear ? '#93c5fd' : '#ffffff'}
                />

                {/* Side Windows */}
                <polygon points="32,36 46,28 51,31 29,44" fill="#ffffff" />
                <line x1="39" y1="32" x2="40" y2="38" />

                {/* Front Headlights OR Rear Taillights */}
                {!isRear ? (
                    <>
                        <polygon points="10,40 14,43 14,45 10,42" fill="#ffffff" />
                        <polygon points="20,47 24,50 24,52 20,49" fill="#ffffff" />
                    </>
                ) : (
                    <>
                        <polygon points="10,40 14,43 14,45 10,42" fill="#ef4444" stroke="#991b1b" />
                        <polygon points="20,47 24,50 24,52 20,49" fill="#ef4444" stroke="#991b1b" />
                    </>
                )}

                {/* Wheels */}
                <ellipse cx="32" cy="51" rx="3.5" ry="5" fill="#1e293b" />
                <ellipse cx="32" cy="51" rx="1.5" ry="2.2" fill="#dbeafe" />
                <ellipse cx="49" cy="41" rx="3.5" ry="5" fill="#1e293b" />
                <ellipse cx="49" cy="41" rx="1.5" ry="2.2" fill="#dbeafe" />
            </g>
        </svg>
    );
}

// --- DYNAMIC VECTOR LOGISTICS BOX TRUCK ---
function VectorTruck({ direction }: { direction: IsoDirection }) {
    const { isFlipped, isRear } = getOrientationFlags(direction);

    return (
        <svg
            viewBox="0 0 64 64"
            style={{
                width: '100%',
                height: '100%',
                transform: isFlipped ? 'scaleX(-1)' : 'none',
                filter: 'drop-shadow(0 3px 6px rgba(20, 184, 166, 0.5))',
            }}
        >
            <g stroke="#0f766e" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
                {!isRear ? (
                    <>
                        {/* Cargo Box (Back) */}
                        <polygon points="22,20 38,30 58,18 42,8" fill="#ccfbf1" />
                        <polygon points="38,30 58,18 58,36 38,48" fill="#5eead4" />
                        <polygon points="22,20 38,30 38,48 22,38" fill="#99f6e4" />

                        {/* Truck Cab (Front) */}
                        <polygon points="10,33 24,42 36,35 22,26" fill="#f0fdfa" />
                        <polygon points="10,33 24,42 24,53 10,44" fill="#99f6e4" />
                        <polygon points="24,42 36,35 36,46 24,53" fill="#5eead4" />

                        {/* Cab Windshield */}
                        <polygon points="12,34 23,41 25,36 15,30" fill="#ffffff" />
                    </>
                ) : (
                    <>
                        {/* Truck Cab (Front - further away) */}
                        <polygon points="28,16 42,25 54,18 40,9" fill="#99f6e4" />
                        <polygon points="42,25 54,18 54,29 42,36" fill="#5eead4" />

                        {/* Cargo Box (Back - facing camera) */}
                        <polygon points="10,26 26,36 46,24 30,14" fill="#ccfbf1" />
                        <polygon points="10,26 26,36 26,54 10,44" fill="#99f6e4" />
                        <polygon points="26,36 46,24 46,42 26,54" fill="#5eead4" />

                        {/* Rear Roll-up Door Detail */}
                        <polygon points="13,31 23,37 23,50 13,44" fill="#f0fdfa" />
                        {/* Taillights */}
                        <line x1="12" y1="45" x2="15" y2="47" stroke="#ef4444" strokeWidth="2.5" />
                        <line x1="21" y1="51" x2="24" y2="53" stroke="#ef4444" strokeWidth="2.5" />
                    </>
                )}

                {/* Wheels */}
                <ellipse cx="29" cy="50" rx="3.5" ry="5" fill="#1e293b" />
                <ellipse cx="29" cy="50" rx="1.5" ry="2.2" fill="#ccfbf1" />
                <ellipse cx="48" cy="39" rx="3.5" ry="5" fill="#1e293b" />
                <ellipse cx="48" cy="39" rx="1.5" ry="2.2" fill="#ccfbf1" />
            </g>
        </svg>
    );
}

export default function MapVehicles({ truckRoutePoints, carCircuitPoints }: MapVehiclesProps) {
    const [isPaused, setIsPaused] = useState(false);

    const [truckDir, setTruckDir] = useState<IsoDirection>('NE');
    const prevTruckPos = useRef<Point | null>(null);
    const currentTruckPos = useRef<Point>({ x: 0, y: 0 });

    const [carDir, setCarDir] = useState<IsoDirection>('NE');
    const prevCarPos = useRef<Point | null>(null);
    const currentCarPos = useRef<Point>({ x: 0, y: 0 });

    // Memoize distance-normalized keyframes so speed stays 100% constant
    const truckMotion = useMemo(
        () => buildSmoothKeyframes(truckRoutePoints, -22, -26),
        [truckRoutePoints]
    );

    const carMotion = useMemo(
        () => buildSmoothKeyframes(carCircuitPoints, -18, -22),
        [carCircuitPoints]
    );

    const handleToggleVehicles = () => {
        setIsPaused((prev) => !prev);
    };

    return (
        <>
            {/* --- SUPPLY LOGISTICS TRUCK --- */}
            <motion.div
                onClick={handleToggleVehicles}
                title={isPaused ? 'Click to resume vehicles' : 'Click to pause vehicles'}
                animate={
                    isPaused
                        ? { x: currentTruckPos.current.x, y: currentTruckPos.current.y }
                        : { x: truckMotion.x, y: truckMotion.y }
                }
                onUpdate={(latest: { x?: number; y?: number }) => {
                    if (latest.x !== undefined && latest.y !== undefined) {
                        currentTruckPos.current = { x: latest.x, y: latest.y };
                        if (!isPaused && prevTruckPos.current) {
                            const dx = latest.x - prevTruckPos.current.x;
                            const dy = latest.y - prevTruckPos.current.y;
                            setTruckDir((prev) => getIsoDirection(dx, dy, prev));
                        }
                        prevTruckPos.current = { x: latest.x, y: latest.y };
                    }
                }}
                transition={
                    isPaused
                        ? { duration: 0 }
                        : {
                              duration: 16,
                              times: truckMotion.times,
                              repeat: Infinity,
                              repeatType: 'reverse',
                              ease: 'linear',
                          }
                }
                style={{
                    position: 'absolute',
                    width: '44px',
                    height: '44px',
                    zIndex: 40,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                }}
            >
                <VectorTruck direction={truckDir} />
            </motion.div>

            {/* --- GLOBAL FLEET PATROL CAR --- */}
            <motion.div
                onClick={handleToggleVehicles}
                title={isPaused ? 'Click to resume vehicles' : 'Click to pause vehicles'}
                animate={
                    isPaused
                        ? { x: currentCarPos.current.x, y: currentCarPos.current.y }
                        : { x: carMotion.x, y: carMotion.y }
                }
                onUpdate={(latest: { x?: number; y?: number }) => {
                    if (latest.x !== undefined && latest.y !== undefined) {
                        currentCarPos.current = { x: latest.x, y: latest.y };
                        if (!isPaused && prevCarPos.current) {
                            const dx = latest.x - prevCarPos.current.x;
                            const dy = latest.y - prevCarPos.current.y;
                            setCarDir((prev) => getIsoDirection(dx, dy, prev));
                        }
                        prevCarPos.current = { x: latest.x, y: latest.y };
                    }
                }}
                transition={
                    isPaused
                        ? { duration: 0 }
                        : {
                              duration: 38,
                              times: carMotion.times,
                              repeat: Infinity,
                              ease: 'linear',
                          }
                }
                style={{
                    position: 'absolute',
                    width: '36px',
                    height: '36px',
                    zIndex: 41,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                }}
            >
                <VectorCar direction={carDir} />
            </motion.div>
        </>
    );
}
