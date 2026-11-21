export interface Point2D {
    x: number;
    y: number;
}

export interface MapDimensions {
    width: number;
    height: number;
}

export const GRID_BOUNDS = {
    minIndex: -10,
    maxColumns: 30,
    maxRows: 26,
};

export const LANDMARK_GRID = {
    warehouse: { x: 4, y: 12 },
    office: { x: 4, y: 4 },
    workshop: { x: 13, y: 4 },
    market: { x: 14, y: 12 },
};

export const TRUCK_WAYPOINTS: Point2D[] = [
    { x: 4, y: 12 },
    { x: 4, y: 8 },
    { x: 8, y: 8 },
    { x: 8, y: 4 },
    { x: 13, y: 4 },
];

export const CAR_WAYPOINTS: Point2D[] = [
    { x: 4, y: 12 },  // Warehouse
    { x: 4, y: 4 },   // Office
    { x: 13, y: 4 },  // Workshop
    { x: 13, y: 12 }, // Grid corner near Market
    { x: 14, y: 12 }, // Market
    { x: 4, y: 12 },  // Back to Warehouse
];

export function getZOffset(gridX: number, gridY: number): number {
    const hillDist = Math.hypot(gridX - 14, gridY - 4);
    const hillElevation = hillDist < 6 ? Math.cos((hillDist / 6) * Math.PI) * 40 + 40 : 0;

    const valleyDist = Math.hypot(gridX - 5, gridY - 11);
    const valleyDepression = valleyDist < 5 ? (Math.cos((valleyDist / 5) * Math.PI) * 0.5 + 0.5) * -25 : 0;

    return hillElevation + valleyDepression;
}

export function projectCoordinate(gridX: number, gridY: number, dimensions: MapDimensions): Point2D {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const spacingX = dimensions.width / 24;
    const spacingY = dimensions.height / 18;
    const rx = (gridX - 10) * spacingX;
    const ry = (gridY - 8) * spacingY;
    const zOffset = getZOffset(gridX, gridY);

    return {
        x: cx + (rx - ry) * 0.85,
        y: cy + (rx + ry) * 0.5 - zOffset,
    };
}

export function buildTerrainRoute(
    waypoints: Point2D[],
    dimensions: MapDimensions,
    cornerRadius = 0.7
): Point2D[] {
    const gridPoints: Point2D[] = [];

    const addStraightSegment = (p1: Point2D, p2: Point2D) => {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.max(1, Math.ceil(dist * 3));
        for (let s = 0; s < steps; s++) {
            const t = s / steps;
            gridPoints.push({
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t,
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

        const entry = {
            x: corner.x - ((corner.x - prev.x) / d1) * r,
            y: corner.y - ((corner.y - prev.y) / d1) * r,
        };
        const exit = {
            x: corner.x + ((next.x - corner.x) / d2) * r,
            y: corner.y + ((next.y - corner.y) / d2) * r,
        };

        addStraightSegment(currentStart, entry);

        const curveSteps = 8;
        for (let s = 0; s <= curveSteps; s++) {
            const t = s / curveSteps;
            const invT = 1 - t;
            gridPoints.push({
                x: invT * invT * entry.x + 2 * invT * t * corner.x + t * t * exit.x,
                y: invT * invT * entry.y + 2 * invT * t * corner.y + t * t * exit.y,
            });
        }

        currentStart = exit;
    }

    const last = waypoints[waypoints.length - 1];
    addStraightSegment(currentStart, last);
    gridPoints.push(last);

    return gridPoints.map((pt) => projectCoordinate(pt.x, pt.y, dimensions));
}
