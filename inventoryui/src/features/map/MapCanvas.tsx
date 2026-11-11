// src/features/map/MapCanvas.tsx
import React from 'react';
import BuildingNode from './BuildingNode';

interface MapCanvasProps {
    onBuildingClick: (name: string) => void;
}

export default function MapCanvas({ onBuildingClick }: MapCanvasProps) {
    return (
        <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            backgroundColor: '#070a13',
            // The wireframe grid texture now matches 100% of your container size perfectly
            backgroundImage: `
        linear-gradient(to right, rgba(20, 184, 166, 0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(20, 184, 166, 0.1) 1px, transparent 1px)
      `,
            backgroundSize: '40px 40px',
            overflow: 'hidden'
        }}>
            {/* 
        Using pure percentage-based coordinates anchors buildings securely relative to window size.
        No matter if your monitor is narrow or wide, the elements fit the available window workspace.
      */}
            <BuildingNode name="Warehouse" top="25%" left="20%" imgSrc="map-warehouse.png" onClick={() => onBuildingClick('Warehouse')} />
            <BuildingNode name="Workshop" top="20%" left="65%" imgSrc="map-workshop.png" onClick={() => onBuildingClick('Workshop')} />
            <BuildingNode name="Market" top="65%" left="20%" imgSrc="map-market.png" onClick={() => onBuildingClick('Market')} />
            <BuildingNode name="Office" top="60%" left="65%" imgSrc="map-office.png" onClick={() => onBuildingClick('Office')} />
        </div>
    );
}