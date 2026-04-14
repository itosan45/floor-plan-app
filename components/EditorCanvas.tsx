
import React from 'react';
import { Marker, Photo } from '../types';
import { EditorState } from '../hooks/useEditorState';
import { InteractiveMarker, MarkerRenderer } from './Marker';
import { Viewport, DrawingLineInfo } from '../hooks/useDrawingInteraction';
import { BASE_CONTAINER_WIDTH, MARKER_DEFINITIONS } from '../constants';

interface EditorCanvasProps {
    floorPlanRef: React.RefObject<HTMLDivElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    viewport: Viewport;
    currentCanvasWidth: number;
    logicalHeight: number;
    isGridMode: boolean;
    gridDataUrl: string;
    floorPlanImage: Photo | null;
    markers: Marker[];
    state: EditorState;
    floorPlanAspectRatio: number | null;
    drawingPhotoMarkerInfo: DrawingLineInfo | null;
    drawingLineInfo: DrawingLineInfo | null;
    updateMarker: (id: string, updates: Partial<Marker>) => void;
    setSelectedMarkerId: (id: string | null) => void;
    removeMarker: (id: string) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
}

const UnifiedDrawingPreview: React.FC<{
    info: DrawingLineInfo | null;
    canvasWidth: number;
    logicalHeight: number;
    isGridMode: boolean;
    gridSize: number;
    lineColor: string;
    lineThickness: number;
}> = ({ info, canvasWidth, logicalHeight, isGridMode, gridSize, lineColor, lineThickness }) => {
    if (!info) return null;
    const { startX, startY, currentX, currentY, type, number, mode } = info;
    const def = MARKER_DEFINITIONS[type as keyof typeof MARKER_DEFINITIONS];
    if (!def) return null;

    const dx = (currentX - startX) * canvasWidth;
    const dy = (currentY - startY) * logicalHeight;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

    const s = canvasWidth / BASE_CONTAINER_WIDTH;
    const baseLen = isGridMode && gridSize ? gridSize : 40 * s;

    const ghostMarker: Marker = {
        id: 'ghost',
        type: type as Marker['type'],
        x: (def.interaction === 'area') ? Math.min(startX, currentX) : startX,
        y: (def.interaction === 'area') ? Math.min(startY, currentY) : startY,
        width: (def.interaction === 'area') ? Math.abs(currentX - startX) : undefined,
        height: (def.interaction === 'area') ? Math.abs(currentY - startY) : undefined,
        rotation: (mode === 'photo' || def.interaction === 'line') ? rotation : 0,
        length: (def.interaction === 'line') ? dist / (isGridMode ? gridSize : 60 * s) : (mode === 'photo' && dist > 10 && !type.startsWith('text_') ? Math.max(0.2, dist / baseLen) : 1.0),
        number,
        color: lineColor,
        lineThickness
    };

    const isArea = def.interaction === 'area';
    const transformStr = isArea ? 'none' : (def.interaction === 'line' ? 'translate(0, -50%)' : 'translate(-50%, -50%)');

    return (
        <div 
            className="absolute pointer-events-none z-[300]" 
            style={{ 
                left: `${ghostMarker.x * 100}%`, 
                top: `${ghostMarker.y * 100}%`, 
                width: ghostMarker.width ? `${ghostMarker.width * 100}%` : undefined,
                height: ghostMarker.height ? `${ghostMarker.height * 100}%` : undefined,
                transform: transformStr
            }}
        >
            <MarkerRenderer 
                marker={ghostMarker} 
                scale={canvasWidth / BASE_CONTAINER_WIDTH} 
                isGridMode={isGridMode} 
                gridSize={gridSize} 
                isPreview={true} 
            />
        </div>
    );
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    floorPlanRef, containerRef, viewport, currentCanvasWidth, logicalHeight,
    isGridMode, gridDataUrl, floorPlanImage, markers, state,
    floorPlanAspectRatio, drawingPhotoMarkerInfo, drawingLineInfo,
    updateMarker, setSelectedMarkerId, onPointerDown, onPointerMove, onPointerUp
}) => {
    const isDrawingOrPlacingMode = 
        state.appMode === 'draw' || 
        state.appMode.startsWith('inspection-');

    const isInteracting = !!drawingLineInfo || !!drawingPhotoMarkerInfo;

    const handlePointerMoveInternal = (e: React.PointerEvent) => {
        onPointerMove(e);
    };

    const imageStyle: React.CSSProperties = state.floorPlanRotation ? {
        transform: `rotate(${state.floorPlanRotation}deg)`,
        transformOrigin: 'center center',
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    } : {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    };

    return (
        <div 
            className={`flex-1 relative overflow-hidden bg-gray-900 ${isInteracting ? 'interacting' : ''}`} 
            ref={containerRef} 
            onPointerDown={onPointerDown} 
            onPointerMove={handlePointerMoveInternal} 
            onPointerUp={onPointerUp} 
            style={{ touchAction: 'none' }}
        >
            {state.statusMessage && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-3 animate-bounce-in ${state.statusMessage.type === 'success' ? 'bg-green-600' : state.statusMessage.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'} text-white`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {state.statusMessage.text}
                </div>
            )}

            <div
                ref={floorPlanRef}
                className={`absolute top-0 left-0 origin-top-left transition-shadow ${isDrawingOrPlacingMode ? 'cursor-crosshair-forced' : 'cursor-grab active:cursor-grabbing'}`}
                style={{ 
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, 
                    width: `${currentCanvasWidth}px`, 
                    height: `${logicalHeight}px`, 
                    backgroundImage: isGridMode ? `url('${gridDataUrl}')` : 'none',
                    backgroundColor: isGridMode ? '#f8fafc' : 'transparent',
                    pointerEvents: 'auto'
                }}
            >
                {floorPlanImage && (
                    <img src={floorPlanImage.dataUrl} alt="map" draggable={false} className="block pointer-events-none" style={imageStyle} />
                )}

                {markers.map(marker => (
                    <InteractiveMarker
                        key={marker.id}
                        toolMode={state.appMode === 'pan' ? 'pan' : 'draw'}
                        marker={marker} onUpdateMarker={updateMarker}
                        onDragStart={() => setSelectedMarkerId(null)}
                        onDragEnd={() => {}}
                        isSelected={state.selectedMarkerId === marker.id}
                        onSelect={setSelectedMarkerId}
                        isDrawing={isInteracting}
                        isPhotographyMode={state.appMode.startsWith('inspection')}
                        containerWidth={currentCanvasWidth}
                        floorPlanAspectRatio={floorPlanAspectRatio}
                        isGridMode={isGridMode}
                        gridSize={state.gridSize}
                    />
                ))}
                
                <svg className="absolute inset-0 pointer-events-none z-20" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#ef4444"><polygon points="0 0, 10 3.5, 0 7" /></marker></defs>
                    {markers.filter(m => m.type === 'comment_box' && m.targetX != null).map(m => (
                        <line key={m.id} x1={(m.x ?? 0) * 100} y1={(m.y ?? 0) * 100} x2={(m.targetX ?? 0) * 100} y2={(m.targetY ?? 0) * 100} stroke="#ef4444" strokeWidth={3} vectorEffect="non-scaling-stroke" markerEnd="url(#arrowhead)" opacity="0.8" />
                    ))}
                </svg>

                <UnifiedDrawingPreview 
                    info={drawingLineInfo || drawingPhotoMarkerInfo}
                    canvasWidth={currentCanvasWidth}
                    logicalHeight={logicalHeight}
                    isGridMode={isGridMode}
                    gridSize={state.gridSize}
                    lineColor={state.currentLineColor}
                    lineThickness={state.currentLineThickness}
                />
            </div>
        </div>
    );
};
