import { useMemo } from 'react';
import { c, alpha } from '../../theme/themes';
import { GRID_BOUNDS, projectCoordinate, type MapDimensions, type Point2D } from './mapGeometry';

interface MapTerrainLayerProps {
    dimensions: MapDimensions;
    truckRoutePoints: Point2D[];
    carCircuitPoints: Point2D[];
}

const generateSvgRoadPath = (points: Point2D[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

function TerrainRoad({ d, color }: { d: string; color: 'accent' | 'info' }) {
    return (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={d} stroke={alpha(color, 0.5)} strokeWidth="12" />
            <path d={d} stroke={c.bgMap} strokeWidth="9.5" />
            <path d={d} stroke={alpha(color, 0.75)} strokeWidth="1.5" strokeDasharray="6, 6" />
        </g>
    );
}

export default function MapTerrainLayer({
    dimensions,
    truckRoutePoints,
    carCircuitPoints,
}: MapTerrainLayerProps) {
    const { horizontalPaths, verticalPaths } = useMemo(() => {
        const { minIndex, maxColumns, maxRows } = GRID_BOUNDS;
        const hPaths: { key: string; d: string }[] = [];
        const vPaths: { key: string; d: string }[] = [];

        for (let r = minIndex; r <= maxRows; r++) {
            let d = '';
            for (let col = minIndex; col <= maxColumns; col++) {
                const pt = projectCoordinate(col, r, dimensions);
                d += `${col === minIndex ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }
            hPaths.push({ key: `h-${r}`, d });
        }

        for (let col = minIndex; col <= maxColumns; col++) {
            let d = '';
            for (let r = minIndex; r <= maxRows; r++) {
                const pt = projectCoordinate(col, r, dimensions);
                d += `${r === minIndex ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }
            vPaths.push({ key: `v-${col}`, d });
        }

        return { horizontalPaths: hPaths, verticalPaths: vPaths };
    }, [dimensions]);

    const gridStroke = alpha('accent', 0.22);

    return (
        <svg
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                pointerEvents: 'none',
            }}
        >
            {horizontalPaths.map((p) => (
                <path key={p.key} d={p.d} fill="none" stroke={gridStroke} strokeWidth="1" />
            ))}
            {verticalPaths.map((p) => (
                <path key={p.key} d={p.d} fill="none" stroke={gridStroke} strokeWidth="1" />
            ))}

            <TerrainRoad d={generateSvgRoadPath(truckRoutePoints)} color="accent" />
            <TerrainRoad d={generateSvgRoadPath(carCircuitPoints)} color="info" />
        </svg>
    );
}
