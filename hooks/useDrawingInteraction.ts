
import React, { useState, useRef } from 'react';
import type { Marker, MarkerType } from '../types';
import { MARKER_DEFINITIONS, BASE_CONTAINER_WIDTH } from '../constants';
import { getCanvasCoordinates, snapToGrid } from '../utils/coordinates';
import { generateUniqueId } from '../utils/common';

export type Viewport = { x: number; y: number; scale: number; };
export type ToolMode = 'draw' | 'pan';

export interface DrawingLineInfo {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    type: MarkerType;
    mode: 'line' | 'photo';
    number?: number;
}

interface InteractionConfig {
    floorPlanRef: React.RefObject<HTMLDivElement>;
    viewport: Viewport;
    setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
    toolMode: ToolMode;
    currentMarkerType: MarkerType;
    isGridMode: boolean;
    gridSize: number;
    currentCanvasWidth: number;
    logicalHeight: number;
    currentLineThickness: number;
    currentLineColor: string;
    markers: Marker[];
    addMarker: (marker: Marker) => void;
    setSelectedMarkerId: (id: string | null) => void;
    showStatus: (msg: string, type: 'success' | 'error' | 'info') => void;
    isPhotographyMode: boolean;
    isManualCameraMode: boolean;
    onPhotoMarkerPlaced: (data: { x: number, y: number, rotation: number, length: number }) => void;
    draftingRoom: { label: string, gridW: number, gridH: number } | null;
    clearPendingRoom: () => void;
}

export const useDrawingInteraction = (config: InteractionConfig) => {
    const {
        floorPlanRef, viewport, setViewport, toolMode, currentMarkerType, isGridMode, 
        gridSize, currentCanvasWidth, logicalHeight, currentLineThickness, currentLineColor, 
        markers, addMarker, setSelectedMarkerId, isPhotographyMode, 
        isManualCameraMode, onPhotoMarkerPlaced, draftingRoom, clearPendingRoom
    } = config;

    const [drawingLineInfo, setDrawingLineInfo] = useState<DrawingLineInfo | null>(null);
    const [drawingPhotoMarkerInfo, setDrawingPhotoMarkerInfo] = useState<DrawingLineInfo | null>(null);
    const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
    
    const drawingDataRef = useRef<DrawingLineInfo | null>(null);
    const isInteracting = useRef(false);
    const isPanning = useRef(false);
    const lastPanPos = useRef<{x: number, y: number} | null>(null);
    const startPosRef = useRef<{x: number, y: number} | null>(null);
    const activePointers = useRef<Set<number>>(new Set());

    // 座標をキャンバス内に収めるクランプ処理
    const clampPos = (val: number) => {
        if (isNaN(val)) return 0;
        return Math.max(-0.05, Math.min(1.05, val));
    };

    const getSnappedPos = (rawX: number, rawY: number, roomW?: number, roomH?: number) => {
        if (currentCanvasWidth <= 0 || !Number.isFinite(currentCanvasWidth)) {
            console.warn('Invalid canvas width:', currentCanvasWidth);
            return { x: 0.5, y: 0.5 };
        }

        if (logicalHeight <= 0 || !Number.isFinite(logicalHeight)) {
            console.warn('Invalid logical height:', logicalHeight);
            return { x: 0.5, y: 0.5 };
        }

        // 0.5グリッド単位のスナップ
        let x = snapToGrid(clampPos(rawX), currentCanvasWidth, gridSize, isGridMode, 2);
        let y = snapToGrid(clampPos(rawY), currentCanvasWidth, gridSize, isGridMode, 2);

        if (isGridMode && roomW && roomH) {
            const cellRatio = gridSize / currentCanvasWidth;
            const snapThreshold = cellRatio * 0.6;

            markers.forEach((m: Marker) => {
                if (m.type !== 'room') return;
                const mX2 = m.x + (m.gridW ?? 0) * cellRatio;
                const mY2 = m.y + (m.gridH ?? 0) * cellRatio;
                const currentX2 = x + roomW * cellRatio;
                const currentY2 = y + roomH * cellRatio;

                if (Math.abs(x - mX2) < snapThreshold) x = mX2;
                if (Math.abs(currentX2 - m.x) < snapThreshold) x = m.x - roomW * cellRatio;
                if (Math.abs(x - m.x) < snapThreshold) x = m.x;
                if (Math.abs(y - mY2) < snapThreshold) y = mY2;
                if (Math.abs(currentY2 - m.y) < snapThreshold) y = m.y - roomH * cellRatio;
                if (Math.abs(y - m.y) < snapThreshold) y = m.y;
            });
        }
        return { x, y };
    };

    const handleRoomPlacement = (e: React.PointerEvent) => {
        if (!draftingRoom) return;
        e.preventDefault();
        const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
        const { x, y } = getSnappedPos(rawX, rawY, draftingRoom.gridW, draftingRoom.gridH);

        const newId = generateUniqueId();
        addMarker({
            id: newId, type: 'room', x, y,
            gridW: draftingRoom.gridW, gridH: draftingRoom.gridH, text: draftingRoom.label
        });
        setSelectedMarkerId(newId);
        clearPendingRoom();
        setHoverPos(null);
    };

    const handlePanStart = (e: React.PointerEvent) => {
        isPanning.current = true;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleDrawStart = (e: React.PointerEvent) => {
        e.preventDefault();
        setSelectedMarkerId(null);
        const activeType = isPhotographyMode ? 'photo' : currentMarkerType;
        const markerDef = MARKER_DEFINITIONS[activeType];

        const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
        const { x, y } = getSnappedPos(rawX, rawY);

        const isDragRequired =
            markerDef.interaction === 'line' || markerDef.interaction === 'area' ||
            markerDef.interaction === 'photo_drag' || (isPhotographyMode && isManualCameraMode);

        if (isDragRequired) {
            isInteracting.current = true;
            const mode: 'line' | 'photo' = (markerDef.interaction === 'photo_drag' || (isPhotographyMode && isManualCameraMode)) ? 'photo' : 'line';
            const newData: DrawingLineInfo = {
                startX: x, startY: y, currentX: x, currentY: y,
                type: activeType, mode,
                number: activeType === 'photo' ? markers.filter(m => m.type === 'photo').length + 1 : undefined
            };
            drawingDataRef.current = newData;
            if (mode === 'photo') setDrawingPhotoMarkerInfo(newData);
            else setDrawingLineInfo(newData);
        }
    };

    const handlePointerStart = (e: React.PointerEvent) => {
        activePointers.current.add(e.pointerId);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startPosRef.current = { x: e.clientX, y: e.clientY };

        if (draftingRoom) {
            handleRoomPlacement(e);
            return;
        }

        if (toolMode === 'pan' && !isPhotographyMode) {
            handlePanStart(e);
            return;
        }

        if (toolMode === 'draw' || isPhotographyMode) {
            handleDrawStart(e);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
        
        if (draftingRoom) {
            const snapped = getSnappedPos(rawX, rawY, draftingRoom.gridW, draftingRoom.gridH);
            setHoverPos(snapped);
        }

        if (!activePointers.current.has(e.pointerId)) return;

        if (isPanning.current && lastPanPos.current) {
            const deltaX = e.clientX - lastPanPos.current.x;
            const deltaY = e.clientY - lastPanPos.current.y;
            setViewport(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (isInteracting.current && drawingDataRef.current) {
            const type = drawingDataRef.current.type;
            const def = MARKER_DEFINITIONS[type];
            
            const { x: snapX, y: snapY } = getSnappedPos(rawX, rawY);
            let x = def.shouldSnap ? snapX : clampPos(rawX);
            let y = def.shouldSnap ? snapY : clampPos(rawY);

            if (def.isOrthogonal && !def.isFree) {
                const dy_px = Math.abs((y - drawingDataRef.current.startY) * logicalHeight);
                const dx_px = Math.abs((x - drawingDataRef.current.startX) * currentCanvasWidth);
                if (dx_px > dy_px) {
                    y = drawingDataRef.current.startY;
                } else {
                    x = drawingDataRef.current.startX;
                }
            }

            drawingDataRef.current.currentX = x;
            drawingDataRef.current.currentY = y;
            if (drawingDataRef.current.mode === 'photo') setDrawingPhotoMarkerInfo({ ...drawingDataRef.current });
            else setDrawingLineInfo({ ...drawingDataRef.current });
        }
    };

    const handlePointerEnd = (e: React.PointerEvent): boolean => {
        activePointers.current.delete(e.pointerId);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        const distPx_client = startPosRef.current ? Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2)) : 0;

        if (isInteracting.current) {
            isInteracting.current = false;
            const data = drawingDataRef.current;
            drawingDataRef.current = null;
            setDrawingLineInfo(null);
            setDrawingPhotoMarkerInfo(null);
            
            if (!data) return false;

            const dx = (data.currentX - data.startX) * currentCanvasWidth;
            const dy = (data.currentY - data.startY) * logicalHeight;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (data.mode === 'photo') {
                const isTextMarker = data.type.startsWith('text_');
                const rotation = (dist > 5 && !isTextMarker) ? Math.atan2(dy, dx) * (180 / Math.PI) : 0;
                
                if (isPhotographyMode && onPhotoMarkerPlaced) {
                    onPhotoMarkerPlaced({ x: data.startX, y: data.startY, rotation: Math.round(rotation / 5) * 5, length: 1.0 });
                    return true;
                } else if (data.type.startsWith('text_') || MARKER_DEFINITIONS[data.type].interaction === 'photo_drag') {
                    const newId = generateUniqueId();
                    addMarker({ id: newId, type: data.type, x: data.startX, y: data.startY, rotation: Math.round(rotation / 5) * 5, length: 1.0 });
                    setSelectedMarkerId(newId);
                    return true;
                }
            } else if (data.mode === 'line') {
                if (dist > 10) {
                    const newId = generateUniqueId();
                    if (MARKER_DEFINITIONS[data.type].interaction === 'area') {
                        addMarker({ id: newId, type: data.type, x: Math.min(data.startX, data.currentX), y: Math.min(data.startY, data.currentY), width: Math.abs(data.currentX - data.startX), height: Math.abs(data.currentY - data.startY), color: currentLineColor, lineThickness: currentLineThickness });
                    } else {
                        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
                        const renderScale = currentCanvasWidth / BASE_CONTAINER_WIDTH;
                        const length = dist / (isGridMode ? gridSize : 60 * renderScale);
                        addMarker({ id: newId, type: data.type, x: data.startX, y: data.startY, rotation: Math.round(rotation / 5) * 5, length, color: currentLineColor, lineThickness: currentLineThickness });
                    }
                    setSelectedMarkerId(newId);
                }
                return true;
            }
        }

        if (isPanning.current) { isPanning.current = false; return false; }

        if ((toolMode === 'draw' || isPhotographyMode) && !draftingRoom) {
            const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
            const activeType = isPhotographyMode ? 'photo' : currentMarkerType;
            const { x, y } = getSnappedPos(rawX, rawY);

            if (isPhotographyMode && !isManualCameraMode) {
                onPhotoMarkerPlaced({ x, y, rotation: 0, length: 1.0 });
                return true;
            } else if (toolMode === 'draw' && distPx_client < 20) {
                const newId = generateUniqueId();
                addMarker({ id: newId, x, y, type: activeType, rotation: 0, length: 1.0, text: MARKER_DEFINITIONS[activeType].defaultText, lineThickness: currentLineThickness });
                setSelectedMarkerId(newId);
                return true;
            }
        }
        return false;
    };

    return { 
        drawingLineInfo, 
        drawingPhotoMarkerInfo, 
        hoverPos, 
        handlePointerStart, 
        handlePointerMove, 
        handlePointerEnd 
    };
};
