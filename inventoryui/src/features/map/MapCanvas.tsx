// src/features/map/MapCanvas.tsx
import { useState, useEffect } from 'react';
import BuildingNode from './BuildingNode';
import MapVehicles from './MapVehicles';
import { useInventoryStore } from '../../data/InventoryContext';
import { c, alpha } from '../../theme/themes';
import AddProductTypeModal from '../workshop/AddProductTypeModal';
import ProduceBatchModal from '../workshop/ProduceBatchModal';
import BuyMaterialsModal from '../market/BuyMaterialsModal';
import SellProductsModal from '../market/SellProductsModal';
import MaterialLimitsModal from '../warehouse/MaterialLimitsModal';
import ProductionMapModal from '../warehouse/ProductionMapModal';
import RemoveMaterialModal from '../office/RemoveMaterialModal';
import RemoveProductModal from '../office/RemoveProductModal';
import WarehouseSemaphore from '../warehouse/WarehouseSemaphore';
const MAX_STOCK = 10000;      // your max stock limit

interface MapCanvasProps {
    onBuildingClick: (name: string) => void;
}

export default function MapCanvas({ onBuildingClick }: MapCanvasProps) {
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
    const [autoImport, setAutoImport] = useState(false);
    const [activeModal, setActiveModal] = useState<
        'addProduct'
        | 'produceBatch'
        | 'buyMaterials'
        | 'sellProducts'
        | 'materialLimits'
        | 'productionMap'
        | 'removeMaterial'
        | 'removeProduct'
        | null>(null);
    const { products, productStocks, unitStocks, units, commissions, refresh } = useInventoryStore(); // shared store, no second fetch

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
            paths.push(<path key={`h-${r}`} d={d} fill="none" stroke={alpha('accent', 0.22)} strokeWidth="1" />);
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
            paths.push(<path key={`v-${c}`} d={d} fill="none" stroke={alpha('accent', 0.22)} strokeWidth="1" />);
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

    // 1. Supply Logistics Truck (Warehouse -> Workshop Loop)
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

    const renderTerrainRoad = (d: string, color: 'accent' | 'info') => (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* 1. Wider outer solid road borders */}
            <path
                d={d}
                stroke={alpha(color, 0.5)}
                strokeWidth="12"
            />
            {/* 2. Wide dark asphalt road bed */}
            <path
                d={d}
                stroke={c.bgMap}
                strokeWidth="9.5"
            />
            {/* 3. Dashed center lane divider */}
            <path
                d={d}
                stroke={alpha(color, 0.75)}
                strokeWidth="1.5"
                strokeDasharray="6, 6"
            />
        </g>
    );

    return (
        <div
            id="map-container"
            style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, backgroundColor: c.bgMap, overflow: 'hidden' }}
        >
            <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                {drawHorizontalLines()}
                {drawVerticalLines()}

                {renderTerrainRoad(generateSvgRoadPath(truckRoutePoints), 'accent')}
                {renderTerrainRoad(generateSvgRoadPath(carCircuitPoints), 'info')}
            </svg>

            {/* Dynamic 4-Way Isometric Vehicles */}
            <MapVehicles
                truckRoutePoints={truckRoutePoints}
                carCircuitPoints={carCircuitPoints}
            />

            {/* Scattered Infrastructure Building Nodes */}
            <BuildingNode name="Warehouse" top={`${warehousePt.y - 75}px`} left={`${warehousePt.x - 65}px`} imgSrc="map-warehouse.png"
                onClick={() => onBuildingClick('Warehouse')}
                onSetupStockLimits={() => setActiveModal('materialLimits')}
                onProductionMap={() => setActiveModal('productionMap')} />
            <WarehouseSemaphore top={`${warehousePt.y - 120}px`} left={`${warehousePt.x + 65}px`} unitStocks={unitStocks} productStocks={productStocks} />
            <BuildingNode name="Office" top={`${officePt.y - 75}px`} left={`${officePt.x - 65}px`} imgSrc="map-office.png"
                onImportInvoice={() => { setAutoImport(true); setActiveModal('buyMaterials') }}
                onRemoveMaterial={() => setActiveModal('removeMaterial')}
                onRemoveProduct={() => setActiveModal('removeProduct')} />
            <BuildingNode name="Workshop" top={`${workshopPt.y - 75}px`} left={`${workshopPt.x - 65}px`} imgSrc="map-workshop.png" onClick={() => onBuildingClick('Workshop')}
                onNewProduct={() => setActiveModal('addProduct')} onCreateProducts={() => setActiveModal('produceBatch')} />
            <BuildingNode name="Market" top={`${marketPt.y - 75}px`} left={`${marketPt.x - 65}px`} imgSrc="map-market.png"
                onBuyMaterials={() => { setAutoImport(false); setActiveModal('buyMaterials') }}
                onSellProducts={() => setActiveModal('sellProducts')}
            />

            {/* Workshop forms */}
            <AddProductTypeModal
                isOpen={activeModal === 'addProduct'}
                materials={units}
                materialStocks={unitStocks}
                availableCommissions={commissions}
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
                autoOpenImport={autoImport}
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

            {/* Warehouse forms */}
            <MaterialLimitsModal
                isOpen={activeModal === 'materialLimits'}
                unitStocks={unitStocks}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />

            <ProductionMapModal
                isOpen={activeModal === 'productionMap'}
                products={products}
                onClose={() => setActiveModal(null)}
            />

            <RemoveMaterialModal
                isOpen={activeModal === 'removeMaterial'}
                materialStocks={unitStocks}
                onClose={() => setActiveModal(null)}
                onSuccess={() => refresh()}
            />

            <RemoveProductModal
                isOpen={activeModal === 'removeProduct'}
                products={products}
                onClose={() => setActiveModal(null)}
                onSuccess={refresh}
            />
        </div>
    );
}
