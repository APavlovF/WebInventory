// src/features/map/MapCanvas.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BuildingNode from './BuildingNode';

interface MapCanvasProps {
    onBuildingClick: (name: string) => void;
}

export default function MapCanvas({ onBuildingClick }: MapCanvasProps) {
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

    // Start with the right-facing asset since it begins at Warehouse traveling up to the Office
    const [carImageAsset, setCarImageAsset] = useState('map-car-right.png');

    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('map-container');
            if (container) {
                setDimensions({
                    width: container.clientWidth || window.innerWidth - 240,
                    height: container.clientHeight || window.innerHeight - 150
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const minIndex = -10;
    const maxColumns = 30;
    const maxRows = 26;

    const getZOffset = (gridX: number, gridY: number) => {
        const hillDist = Math.hypot(gridX - 14, gridY - 4);
        const hillElevation = hillDist < 6 ? Math.cos((hillDist / 6) * Math.PI) * 40 + 40 : 0;

        const valleyDist = Math.hypot(gridX - 5, gridY - 11);
        const valleyDepression = valleyDist < 5 ? (Math.cos((valleyDist / 5) * Math.PI) * 0.5 + 0.5) * -25 : 0;

        return hillElevation + valleyDepression;
    };

    const projectCoordinate = (gridX: number, gridY: number) => {
        const spacingX = dimensions.width / 24;
        const spacingY = dimensions.height / 18;
        const rx = (gridX - 10) * spacingX;
        const ry = (gridY - 8) * spacingY;
        const zOffset = getZOffset(gridX, gridY);

        return {
            x: cx + (rx - ry) * 0.85,
            y: cy + (rx + ry) * 0.5 - zOffset
        };
    };

    const drawHorizontalLines = () => {
        const paths = [];
        for (let r = minIndex; r <= maxRows; r++) {
            let d = '';
            for (let c = minIndex; c <= maxColumns; c++) {
                const pt = projectCoordinate(c, r);
                d += `${c === minIndex ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }
            paths.push(<path key={`h-${r}`} d={d} fill="none" stroke="rgba(20, 184, 166, 0.22)" strokeWidth="1" />);
        }
        return paths;
    };

    const drawVerticalLines = () => {
        const paths = [];
        for (let c = minIndex; c <= maxColumns; c++) {
            let d = '';
            for (let r = minIndex; r <= maxRows; r++) {
                const pt = projectCoordinate(c, r);
                d += `${r === minIndex ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }
            paths.push(<path key={`v-${c}`} d={d} fill="none" stroke="rgba(20, 184, 166, 0.22)" strokeWidth="1" />);
        }
        return paths;
    };

    // Base Landmark Nodes
    const warehousePt = projectCoordinate(4, 12);
    const officePt = projectCoordinate(4, 4);
    const workshopPt = projectCoordinate(13, 4);
    const marketPt = projectCoordinate(14, 12);

    // 1. Supply Logistics Truck (Warehouse ➔ Workshop Loop)
    const truckRoutePoints = [
        projectCoordinate(4, 12),
        projectCoordinate(4, 8),
        projectCoordinate(8, 8),
        projectCoordinate(8, 4),
        projectCoordinate(13, 4),
    ];

    // 2. Global Fleet Patrol Car Circuit Path (Starting at Warehouse)
    const carCircuitPoints = [
        projectCoordinate(4, 12),  // 0: Start at Warehouse Node
        projectCoordinate(4, 8),
        projectCoordinate(4, 4),   // 1: Office Node
        projectCoordinate(8, 4),
        projectCoordinate(13, 4),  // 2: Workshop Node (Halfway Switch Point)
        projectCoordinate(13, 8),
        projectCoordinate(14, 12), // 3: Market Node
        projectCoordinate(9, 12),
        projectCoordinate(4, 12),  // 4: Back to Warehouse (Loop Closure)
    ];

    const generateSvgRoadPath = (points: { x: number, y: number }[]) => {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    return (
        <div
            id="map-container"
            style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, backgroundColor: '#070a13', overflow: 'hidden' }}
        >
            <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                {drawHorizontalLines()}
                {drawVerticalLines()}

                <path d={generateSvgRoadPath(truckRoutePoints)} fill="none" stroke="rgba(20, 184, 166, 0.12)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={generateSvgRoadPath(truckRoutePoints)} fill="none" stroke="rgba(20, 184, 166, 0.3)" strokeWidth="1" strokeDasharray="6,6" />

                <path d={generateSvgRoadPath(carCircuitPoints)} fill="none" stroke="rgba(14, 165, 233, 0.1)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={generateSvgRoadPath(carCircuitPoints)} fill="none" stroke="rgba(14, 165, 233, 0.25)" strokeWidth="1" strokeDasharray="6,6" />
            </svg>

            {/* --- SUPPLY LOGISTICS TRUCK (WAREHOUSE ➔ WORKSHOP LOOP) --- */}
            <motion.div
                animate={{ x: truckRoutePoints.map(p => p.x - 20), y: truckRoutePoints.map(p => p.y - 20) }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute', width: '40px', height: '40px', zIndex: 40,
                    pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <img
                    src="map-truck.png"
                    alt="Truck"
                    style={{
                        width: '100%', height: 'auto',
                        mixBlendMode: 'screen',
                        filter: 'drop-shadow(0 2px 6px rgba(20, 184, 166, 0.4))'
                    }}
                />
            </motion.div>

            {/* --- GLOBAL FLEET PATROL CAR (FULL CIRCUIT LOOP) --- */}
            <motion.div
                animate={{
                    x: carCircuitPoints.map(p => p.x - 16),
                    y: carCircuitPoints.map(p => p.y - 16),
                }}
                onUpdate={(latest: any) => {
                    if (latest.x !== undefined && latest.y !== undefined) {
                        const currentX = latest.x + 16;
                        const currentY = latest.y + 16;

                        // Check proximity to key turning corners using a precise bounding radius
                        const nearWarehouse = Math.abs(currentX - warehousePt.x) < 8 && Math.abs(currentY - warehousePt.y) < 8;
                        const nearWorkshop = Math.abs(currentX - workshopPt.x) < 8 && Math.abs(currentY - workshopPt.y) < 8;

                        if (nearWarehouse) {
                            setCarImageAsset('map-car-right.png');
                        } else if (nearWorkshop) {
                            setCarImageAsset('map-car-left.png');
                        }
                    }
                }}
                transition={{
                    duration: 38,
                    repeat: Infinity,
                    ease: "linear"
                }}
                style={{
                    position: 'absolute', width: '32px', height: '32px', zIndex: 41,
                    pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <img
                    src={carImageAsset}
                    alt="Car"
                    style={{
                        width: '100%',
                        height: 'auto',
                        mixBlendMode: 'screen',
                        filter: 'drop-shadow(0 2px 6px rgba(14, 165, 233, 0.4))'
                    }}
                />
            </motion.div>

            {/* Scattered Infrastructure Building Nodes */}
            <BuildingNode name="Warehouse" top={`${warehousePt.y - 75}px`} left={`${warehousePt.x - 65}px`} imgSrc="map-warehouse.png" onClick={() => onBuildingClick('Warehouse')} />
            <BuildingNode name="Office" top={`${officePt.y - 75}px`} left={`${officePt.x - 65}px`} imgSrc="map-office.png" onClick={() => onBuildingClick('Office')} />
            <BuildingNode name="Workshop" top={`${workshopPt.y - 75}px`} left={`${workshopPt.x - 65}px`} imgSrc="map-workshop.png" onClick={() => onBuildingClick('Workshop')} />
            <BuildingNode name="Market" top={`${marketPt.y - 75}px`} left={`${marketPt.x - 65}px`} imgSrc="map-market.png" onClick={() => onBuildingClick('Market')} />
        </div>
    );
}