
import React, { useState, useRef } from 'react';
import type { Marker, MarkerType } from '../types';
import { MARKER_DEFINITIONS, BASE_CONTAINER_WIDTH, GRID_DRAWING_SUBDIVISIONS } from '../constants';
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
    selectedPhotoId: string | null;
    onPhotoMarkerPlaced: (data: { x: number, y: number, rotation: number, length: number }) => void;
}

export const useDrawingInteraction = (config: InteractionConfig) => {
    const {
        floorPlanRef, setViewport, toolMode, currentMarkerType, isGridMode, 
        gridSize, currentCanvasWidth, logicalHeight, currentLineThickness, currentLineColor, 
        markers, addMarker, setSelectedMarkerId, showStatus, isPhotographyMode, 
        isManualCameraMode, selectedPhotoId, onPhotoMarkerPlaced
    } = config;

    const [drawingLineInfo, setDrawingLineInfo] = useState<DrawingLineInfo | null>(null);
    const [drawingPhotoMarkerInfo, setDrawingPhotoMarkerInfo] = useState<DrawingLineInfo | null>(null);
    
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

    const getSnappedPos = (
        rawX: number,
        rawY: number,
        subdivisions = 2
    ) => {
        // 安全ガード: キャンバス幅が0の場合は計算をスキップ
        if (currentCanvasWidth <= 0) return { x: rawX, y: rawY };

        let x = snapToGrid(clampPos(rawX), currentCanvasWidth, gridSize, subdivisions);
        let y = snapToGrid(clampPos(rawY), logicalHeight, gridSize, subdivisions);

        return { x, y };
    };

    const handlePointerStart = (e: React.PointerEvent) => {
        activePointers.current.add(e.pointerId);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startPosRef.current = { x: e.clientX, y: e.clientY };

        // 2. パン（移動）モード
        if (toolMode === 'pan' && !isPhotographyMode) {
            isPanning.current = true;
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // 3. 描画・写真撮影モード
        if (toolMode === 'draw' || isPhotographyMode) {
            e.preventDefault();
            setSelectedMarkerId(null);
            const activeType = isPhotographyMode ? 'photo' : currentMarkerType;
            const markerDef = MARKER_DEFINITIONS[activeType];
            
            // 写真マーカーの場合、写真が選択されていなければ何もしない
            if (activeType === 'photo' && !isPhotographyMode && !isManualCameraMode && !selectedPhotoId) {
                showStatus("配置する写真を選択してください", "error");
                return;
            }

            const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
            const snapSubdivisions = markerDef.interaction === 'line' || markerDef.interaction === 'area'
                ? GRID_DRAWING_SUBDIVISIONS
                : 2;
            const { x, y } = getSnappedPos(rawX, rawY, snapSubdivisions);

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
            return;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
        
        if (!activePointers.current.has(e.pointerId)) return;

        // 2. パン（移動）モード
        if (isPanning.current && lastPanPos.current) {
            const deltaX = e.clientX - lastPanPos.current.x;
            const deltaY = e.clientY - lastPanPos.current.y;
            setViewport(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // 3. 描画・写真撮影モード（ドラッグ中）
        if (isInteracting.current && drawingDataRef.current) {
            const type = drawingDataRef.current.type;
            const def = MARKER_DEFINITIONS[type];
            
            const snapSubdivisions = def.interaction === 'line' || def.interaction === 'area'
                ? GRID_DRAWING_SUBDIVISIONS
                : 2;
            const { x: snapX, y: snapY } = getSnappedPos(rawX, rawY, snapSubdivisions);
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
            return;
        }
    };

    const handlePointerEnd = (e: React.PointerEvent): boolean => {
        activePointers.current.delete(e.pointerId);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        const distPx_client = startPosRef.current ? Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2)) : 0;

        // 1. 描画・写真撮影モード（ドラッグ終了）
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
                
                // Calculate length based on drag distance so arrow ends at mouse
                const s = currentCanvasWidth / BASE_CONTAINER_WIDTH;
                const baseLen = isGridMode && gridSize ? gridSize : 40 * s;
                const length = (dist > 10 && !isTextMarker) ? Math.max(0.2, dist / baseLen) : 1.0;
                
                if (isPhotographyMode && onPhotoMarkerPlaced) {
                    onPhotoMarkerPlaced({ x: data.startX, y: data.startY, rotation: Math.round(rotation / 5) * 5, length });
                    return true;
                } else if (data.type.startsWith('text_') || MARKER_DEFINITIONS[data.type].interaction === 'photo_drag') {
                    const newId = generateUniqueId();
                    addMarker({ id: newId, type: data.type, x: data.startX, y: data.startY, rotation: Math.round(rotation / 5) * 5, length });
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
            return false;
        }

        // 2. パン（移動）モード（ドラッグ終了）
        if (isPanning.current) { 
            isPanning.current = false; 
            return false; 
        }

        // 3. 描画・写真撮影モード（クリック配置）
        if ((toolMode === 'draw' || isPhotographyMode)) {
            const { x: rawX, y: rawY } = getCanvasCoordinates(e.clientX, e.clientY, floorPlanRef.current);
            const activeType = isPhotographyMode ? 'photo' : currentMarkerType;
            
            if (activeType === 'photo' && !isPhotographyMode && !isManualCameraMode && !selectedPhotoId) {
                return false;
            }
            
            const def = MARKER_DEFINITIONS[activeType];
            const snapSubdivisions = def.interaction === 'line' || def.interaction === 'area'
                ? GRID_DRAWING_SUBDIVISIONS
                : 2;
            const { x, y } = getSnappedPos(rawX, rawY, snapSubdivisions);

            if (isPhotographyMode && !isManualCameraMode) {
                onPhotoMarkerPlaced({ x, y, rotation: 0, length: 1.0 });
                return true;
            } else if (toolMode === 'draw' && distPx_client < 20) {
                const newId = generateUniqueId();
                const number = activeType === 'photo' ? markers.filter(m => m.type === 'photo').length + 1 : undefined;
                addMarker({ id: newId, x, y, type: activeType, rotation: 0, length: 1.0, text: MARKER_DEFINITIONS[activeType].defaultText, lineThickness: currentLineThickness, number });
                setSelectedMarkerId(newId);
                return true;
            }
        }
        return false;
    };

    return { 
        drawingLineInfo, 
        drawingPhotoMarkerInfo, 
        handlePointerStart, 
        handlePointerMove, 
        handlePointerEnd 
    };
};
