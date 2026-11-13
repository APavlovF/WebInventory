// src/features/map/MapCanvas.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import BuildingNode from './BuildingNode';
import { useInventory } from '../workshop/UseInventory';
import AddProductTypeModal from '../workshop/AddProductTypeModal';
import ProduceBatchModal from '../workshop/ProduceBatchModal';
import BuyMaterialsModal from '../market/BuyMaterialsModal';
import SellProductsModal from '../market/SellProductsModal';

const MAX_STOCK = 100;      // your max stock limit

interface MapCanvasProps {
    onBuildingClick: (name: string) => void;
    isLoggedIn: boolean;
}

export default function MapCanvas({ onBuildingClick, isLoggedIn }: MapCanvasProps) {
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

    const [activeModal, setActiveModal] = useState < 'addProduct' | 'produceBatch' | 'buyMaterials' | 'sellProducts' | null>(null);
    const { products, productStocks, unitStocks, units, refresh } = useInventory(isLoggedIn);

    // Start with the right-facing asset since it begins at Warehouse traveling up to the Office
    const [carImageAsset, setCarImageAsset] = useState('map-car-right.png');
    const prevCarX = useRef<number | null>(null);

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

    // Expands corner waypoints into every single grid cell along the path
    const buildTerrainRoute = (waypoints: { x: number; y: number }[], cornerRadius = 0.7) => {
        const gridPoints: { x: number; y: number }[] = [];

        const addStraightSegment = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const steps = Math.max(1, Math.ceil(dist * 3)); // Sample 3x per grid unit for smooth slopes
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                gridPoints.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                });
            }
        };

        let currentStart = waypoints[0];

        for (let i = 1; i < waypoints.length - 1; i++) {
            const prev = waypoints[i - 1];
            const corner = waypoints[i];
            const next = waypoints[i + 1];

            const d1 = Math.hypot(corner.x - prev.x, corner.y - prev.y);
            const d2 = Math.hypot(next.x - corner.x, next.y - corner.y);
            const r = Math.min(cornerRadius, d1 * 0.45, d2 * 0.45);

            // Points where the curve enters and exits the corner
            const entry = {
                x: corner.x - ((corner.x - prev.x) / d1) * r,
                y: corner.y - ((corner.y - prev.y) / d1) * r
            };
            const exit = {
                x: corner.x + ((next.x - corner.x) / d2) * r,
                y: corner.y + ((next.y - corner.y) / d2) * r
            };

            // 1. Straight approach up to the curve entry
            addStraightSegment(currentStart, entry);

            // 2. Smooth quadratic curve around the corner
            const curveSteps = 8;
            for (let s = 0; s <= curveSteps; s++) {
                const t = s / curveSteps;
                const invT = 1 - t;
                gridPoints.push({
                    x: invT * invT * entry.x + 2 * invT * t * corner.x + t * t * exit.x,
                    y: invT * invT * entry.y + 2 * invT * t * corner.y + t * t * exit.y
                });
            }

            currentStart = exit;
        }

        // Final straight segment to the destination
        const last = waypoints[waypoints.length - 1];
        addStraightSegment(currentStart, last);
        gridPoints.push(last);

        // Project all grid points onto the 3D terrain
        return gridPoints.map(pt => projectCoordinate(pt.x, pt.y));
    };


    // 1. Supply Logistics Truck (Warehouse ➔ Workshop Loop)
    const truckRoutePoints = buildTerrainRoute([
        { x: 4, y: 12 },
        { x: 4, y: 8 },
        { x: 8, y: 8 },
        { x: 8, y: 4 },
        { x: 13, y: 4 },
    ]);

    // 2. Global Fleet Patrol Car Circuit Path (Starting at Warehouse)
    const carCircuitPoints = buildTerrainRoute([
        { x: 4, y: 12 },  // Start at Warehouse Node
        { x: 4, y: 4 },   // Office Node
        { x: 13, y: 4 },  // Workshop Node
        { x: 13, y: 12 }, // Grid corner near Market
        { x: 14, y: 12 }, // Market Node
        { x: 4, y: 12 },  // Back to Warehouse
    ]);

    const generateSvgRoadPath = (points: { x: number, y: number }[]) => {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    const renderTerrainRoad = (d: string, rgbColor: string) => (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* 1. Wider outer solid road borders */}
            <path
                d={d}
                stroke={`rgba(${rgbColor}, 0.5)`}
                strokeWidth="12"
            />
            {/* 2. Wide dark asphalt road bed */}
            <path
                d={d}
                stroke="#070a13"
                strokeWidth="9.5"
            />
            {/* 3. Dashed center lane divider */}
            <path
                d={d}
                stroke={`rgba(${rgbColor}, 0.75)`}
                strokeWidth="1.5"
                strokeDasharray="6, 6"
            />
        </g>
    );   

    return (
        <div
            id="map-container"
            style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, backgroundColor: '#070a13', overflow: 'hidden' }}
        >
            <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                {drawHorizontalLines()}
                {drawVerticalLines()}

                {renderTerrainRoad(generateSvgRoadPath(truckRoutePoints), '20, 184, 166')}
                {renderTerrainRoad(generateSvgRoadPath(carCircuitPoints), '14, 165, 233')}
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
                    if (latest.x !== undefined) {
                        if (prevCarX.current !== null) {
                            const deltaX = latest.x - prevCarX.current;

                            // Switch sprite based on horizontal movement (with a small 0.2px threshold to prevent jitter)
                            if (deltaX > 0.2 && carImageAsset !== 'map-car-right.png') {
                                setCarImageAsset('map-car-right.png');
                            } else if (deltaX < -0.2 && carImageAsset !== 'map-car-left.png') {
                                setCarImageAsset('map-car-left.png');
                            }
                        }
                        prevCarX.current = latest.x;
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
            <BuildingNode name="Workshop" top={`${workshopPt.y - 75}px`} left={`${workshopPt.x - 65}px`} imgSrc="map-workshop.png" onClick={() => onBuildingClick('Workshop')}
                onNewProduct={() => setActiveModal('addProduct')} onCreateProducts={() => setActiveModal('produceBatch')} />
            <BuildingNode name="Market" top={`${marketPt.y - 75}px`} left={`${marketPt.x - 65}px`} imgSrc="map-market.png"
                onClick={() => onBuildingClick('Market')}
                onBuyMaterials={() => setActiveModal('buyMaterials')}
                onSellProducts={() => setActiveModal('sellProducts')}
            />
            {/* Workshop forms */}
            <AddProductTypeModal
                isOpen={activeModal === 'addProduct'}
                materials={units}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />

            <ProduceBatchModal
                isOpen={activeModal === 'produceBatch'}
                products={products}
                productStocks={productStocks}
                materialStocks={unitStocks}
                maxStock={MAX_STOCK}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />

            <BuyMaterialsModal
                isOpen={activeModal === 'buyMaterials'}
                units={units}
                materialStocks={unitStocks}
                maxStock={1000}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />

            <SellProductsModal
                isOpen={activeModal === 'sellProducts'}
                products={products}
                productStocks={productStocks}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />
        </div>
    );
}