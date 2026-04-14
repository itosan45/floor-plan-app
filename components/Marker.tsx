
import React, { useRef } from 'react';
import type { Marker, MarkerType } from '../types';
import { MARKER_DEFINITIONS, BASE_CONTAINER_WIDTH, GRID_DRAWING_SUBDIVISIONS } from '../constants';
import { snapToGrid } from '../utils/coordinates';
import { AgitatorFanIcon, BlowerFanIcon, TimerIcon } from './icons';
import { useEditorContext } from '../contexts/EditorContext';

interface MarkerComponentProps {
    marker: Marker;
    scale: number;
    isGridMode?: boolean;
    gridSize?: number;
    isSelected?: boolean;
    previewSize?: number;
    isPreview?: boolean;
    uiMode?: 'office' | 'field';
}

const POINT_BASE_SIZE = 28;
const LINE_BASE_HEIGHT = 10;
const GRID_BASE_UNIT = 24;

const getRenderUnit = (scale: number, isGridMode?: boolean, gridSize?: number) => {
    if (isGridMode && gridSize) {
        return gridSize / GRID_BASE_UNIT;
    }
    return scale;
};

const getSize = (scale: number, isGridMode: boolean | undefined, gridSize: number | undefined, basePx: number, previewSize?: number, uiMode?: string) => {
    if (previewSize) return previewSize;
    
    let adjustedBase = basePx;
    if (uiMode === 'field') adjustedBase *= 1.5;

    return adjustedBase * getRenderUnit(scale, isGridMode, gridSize);
};

const getLineThicknessPx = (
    markerThickness: number | undefined,
    scale: number,
    isGridMode: boolean | undefined,
    gridSize: number | undefined,
    fallbackBasePx: number,
    modeScale = 1
) => {
    const renderUnit = getRenderUnit(scale, isGridMode, gridSize);
    const baseThickness = markerThickness ?? fallbackBasePx;
    return baseThickness * renderUnit * modeScale;
};

const getMarkerZIndex = (type: MarkerType, isSelected: boolean): number => {
    // 選択中のマーカーは常に最前面(200以上)
    if (isSelected) return 300;
    if (type.startsWith('text_') || type === 'comment_box' || type === 'photo') return 30;
    if (type === 'access_opening' || type === 'ventilation_opening' || type === 'crack_line') return 25;
    return 10;
};

const CommentBoxMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const s = previewSize ? (previewSize / GRID_BASE_UNIT) : getRenderUnit(scale, isGridMode, gridSize);
    const modeS = uiMode === 'field' ? 1.5 : 1.0;
    return (
        <div
            className={`rounded-lg shadow-xl border-2 whitespace-pre-wrap break-words ${isPreview ? 'opacity-50 border-dashed' : ''}`}
            style={{
                padding: `${8 * s * modeS}px`,
                width: previewSize ? '100%' : `${160 * s * modeS}px`,
                fontSize: `${14 * s * modeS}px`,
                backgroundColor: '#ffffff',
                borderColor: marker.color || '#3b82f6',
                fontWeight: 900,
                borderLeftWidth: `${6 * s * modeS}px`
            }}
        >
            {marker.text || "文字"}
        </div>
    );
};

const PhotoMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const baseSize = uiMode === 'field' ? 36 : 24;
    const markerSize = getSize(scale, isGridMode, gridSize, baseSize, previewSize, uiMode);
    const renderUnit = previewSize ? (previewSize / baseSize) : getRenderUnit(scale, isGridMode, gridSize);
    
    const arrowLength = (marker.length ?? 1.0) * (isGridMode && gridSize ? gridSize : 40 * renderUnit);
    const strokeWidth = previewSize
        ? Math.max(2, 5 * renderUnit)
        : getLineThicknessPx(undefined, scale, isGridMode, gridSize, 5, 1);

    return (
        <div className={`relative flex items-center justify-center ${isPreview ? 'animate-pulse' : ''}`} style={{ width: `${markerSize}px`, height: `${markerSize}px` }}>
            <div 
                className="absolute left-1/2 top-1/2" 
                style={{ 
                    width: `${arrowLength}px`, 
                    height: `${strokeWidth * 6}px`, 
                    transform: `translate(0, -50%) rotate(${marker.rotation ?? 0}deg)`, 
                    transformOrigin: 'left center',
                    pointerEvents: 'none'
                }}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${arrowLength} ${strokeWidth * 6}`} style={{ overflow: 'visible', display: 'block' }}>
                    <line 
                        x1="0" 
                        y1={strokeWidth * 3} 
                        x2={arrowLength} 
                        y2={strokeWidth * 3} 
                        stroke={isPreview ? "#6366f1" : "#000"} 
                        strokeWidth={strokeWidth} 
                        strokeDasharray={isPreview ? "4,2" : "none"}
                        strokeLinecap="butt" 
                    />
                    <path 
                        d={`M ${arrowLength},${strokeWidth * 3} L ${arrowLength - strokeWidth * 4},${strokeWidth * 1} L ${arrowLength - strokeWidth * 4},${strokeWidth * 5} Z`} 
                        fill={isPreview ? "#6366f1" : "#000"} 
                    />
                </svg>
            </div>
            <div className={`relative z-10 w-full h-full rounded-full shadow-lg bg-white overflow-hidden border-black flex items-center justify-center ${isPreview ? 'border-dashed' : ''}`} style={{ borderWidth: `${strokeWidth * 1.3}px` }}>
                <svg viewBox="0 0 100 100" className="w-full h-full block">
                    <text 
                        x="50%" 
                        y="55%" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        style={{ 
                            fontSize: '68px', 
                            fontWeight: 950, 
                            fontFamily: 'Noto Sans JP, sans-serif',
                            fill: '#000000'
                        }}
                    >
                        {marker.number ?? '?'}
                    </text>
                </svg>
            </div>
        </div>
    );
};

const PointIconMarker: React.FC<MarkerComponentProps & { color?: string, label?: string }> = ({ scale, isGridMode, gridSize, previewSize, color, label, isPreview, uiMode }) => {
    const size = getSize(scale, isGridMode, gridSize, POINT_BASE_SIZE, previewSize, uiMode);
    return (
        <div className={`flex items-center justify-center font-black select-none ${color || 'text-red-600'} ${isPreview ? 'opacity-40 animate-pulse' : ''}`} style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 1.2}px`, lineHeight: 1 }}>
            {label || '×'}
        </div>
    );
};

const LineMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const isBlock = marker.type.includes('block');
    const modeS = uiMode === 'field' ? 1.6 : 1.0;
    let height;
    
    if (previewSize) {
        height = 10;
    } else {
        const fallbackBasePx = isGridMode && gridSize
            ? (isBlock ? gridSize * 0.4 / getRenderUnit(scale, isGridMode, gridSize) : gridSize * 0.2 / getRenderUnit(scale, isGridMode, gridSize))
            : (isBlock ? 16 : LINE_BASE_HEIGHT);
        height = getLineThicknessPx(marker.lineThickness, scale, isGridMode, gridSize, fallbackBasePx, modeS);
    }

    const width = previewSize ? '100%' : (isGridMode && gridSize ? (marker.length ?? 1) * gridSize : (marker.length ?? 1) * 60 * scale);
    return (
        <div 
            style={{ 
                width: previewSize ? '100%' : `${width}px`, 
                height: `${height}px`, 
                boxSizing: 'border-box',
                backgroundColor: (isBlock && !previewSize) ? 'transparent' : (marker.color || '#000'),
                borderRadius: '0px',
                transform: previewSize ? 'none' : `rotate(${marker.rotation ?? 0}deg)`,
                transformOrigin: 'left center',
                opacity: isPreview ? 0.4 : 1,
                border: isPreview ? '2px dashed #6366f1' : 'none'
            }} 
            className={isBlock ? 'bg-stripe' : ''}
        />
    );
};

const CrackLineMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const modeS = uiMode === 'field' ? 1.5 : 1.0;
    const width = previewSize ? '100%' : (isGridMode && gridSize ? (marker.length ?? 1) * gridSize : (marker.length ?? 1) * 60 * scale);
    const height = previewSize ? 14 : (isGridMode && gridSize ? gridSize * 0.5 : 16 * scale * modeS);
    const strokeWidth = previewSize ? 3 : getLineThicknessPx(marker.lineThickness, scale, isGridMode, gridSize, 5, modeS);
    
    return (
        <div style={{ width, height: `${height}px`, transform: previewSize ? 'none' : `rotate(${marker.rotation ?? 0}deg)`, transformOrigin: 'left center', opacity: isPreview ? 0.4 : 1 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <path d="M0,10 C10,0 20,20 30,10 C40,0 50,20 60,10 C70,0 80,20 90,10 L100,10" fill="none" stroke="#4b5563" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={isPreview ? "5,5" : "none"} />
            </svg>
        </div>
    );
};

const AreaMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const isImpassable = marker.type === 'impassable_area';
    const isDrilling = marker.type === 'drilling_injection';
    const isAccessOpening = marker.type === 'access_opening';
    const isVentilation = marker.type === 'ventilation_opening';

    let bgColor = 'transparent';
    if (isImpassable) {
        bgColor = isPreview ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.4)';
    } else if (isAccessOpening || isVentilation) {
        bgColor = '#ffffff'; 
    } else if (isPreview) {
        bgColor = 'rgba(99, 102, 241, 0.2)';
    }

    const patternClass = isDrilling ? 'bg-stripe' : isVentilation ? 'bg-mesh' : '';
    const borderStyleClass = isImpassable ? 'border-none' : (isPreview ? 'border-dashed border-indigo-500' : 'border-solid');

    const modeS = uiMode === 'field' ? 1.6 : 1.0;
    let borderWidth = isImpassable ? 0 : uiMode === 'field' ? 4 : 2;
    
    if (!isImpassable && !previewSize) {
        const fallbackBasePx = isGridMode && gridSize
            ? gridSize * 0.2 / getRenderUnit(scale, isGridMode, gridSize)
            : LINE_BASE_HEIGHT;
        borderWidth = getLineThicknessPx(marker.lineThickness, scale, isGridMode, gridSize, fallbackBasePx, modeS);
    } else if (previewSize) {
        borderWidth = 2;
    }

    return (
        <div 
            className={`w-full h-full ${patternClass} ${borderStyleClass}`} 
            style={{ 
                boxSizing: 'border-box',
                backgroundColor: bgColor,
                borderColor: isImpassable ? 'transparent' : (marker.color || (isDrilling ? '#3b82f6' : '#000')),
                borderWidth: `${borderWidth}px`,
                minHeight: previewSize ? '20px' : 'auto',
                opacity: isPreview ? 0.7 : 1
            }} 
        />
    );
};

const IconMarker: React.FC<MarkerComponentProps & { Icon: React.FC<{ className?: string, style?: React.CSSProperties }>, color?: string }> = ({ scale, isGridMode, gridSize, previewSize, Icon, color, isPreview, uiMode }) => {
    const size = getSize(scale, isGridMode, gridSize, 36, previewSize, uiMode);
    return (
        <div className={`flex items-center justify-center ${isPreview ? 'opacity-40 animate-pulse' : ''}`} style={{ width: `${size}px`, height: `${size}px` }}>
            <Icon className={`${color || 'text-gray-900'} drop-shadow-md`} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

const SprayArrowMarker: React.FC<MarkerComponentProps> = ({ marker, scale, isGridMode, gridSize, previewSize, isPreview, uiMode }) => {
    const baseSize = 36;
    const dynamicScale = marker.length ?? 1.0;
    const size = getSize(scale, isGridMode, gridSize, baseSize, previewSize, uiMode) * (previewSize ? 1 : dynamicScale);
    
    return (
         <div className={`flex items-center justify-center bg-orange-500 rounded-full text-white font-black shadow-md select-none ${isPreview ? 'opacity-40 border-2 border-white' : ''}`} 
            style={{ 
                width: `${size}px`, 
                height: `${size}px`, 
                fontSize: `${size * 0.7}px`, 
                transform: previewSize ? 'none' : `rotate(${marker.rotation ?? 0}deg)` 
            }}>
            →
         </div>
    );
};

export const MarkerRenderer: React.FC<MarkerComponentProps> = (props) => {
    const { marker } = props;
    switch (marker.type) {
        case 'photo': return <PhotoMarker {...props} />;
        case 'intrusion': return <PointIconMarker {...props} label="×" color="text-red-600" />;
        case 'presence': return <PointIconMarker {...props} label="×" color="text-red-700 font-black" />;
        case 'access_point': return (
            <div className={`bg-white border-2 border-black relative ${props.isPreview ? 'opacity-50 border-dashed' : ''}`} style={{ width: props.uiMode === 'field' ? '32px' : '22px', height: props.uiMode === 'field' ? '32px' : '22px' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="16" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="black" strokeWidth="16" />
                </svg>
            </div>
        );
        case 'foundation_line':
        case 'foundation_line_free':
        case 'foundation_line_block':
        case 'foundation_line_block_free': return <LineMarker {...props} />;
        case 'crack_line': return <CrackLineMarker {...props} />;
        case 'rectangle_outline':
        case 'access_opening':
        case 'ventilation_opening':
        case 'impassable_area':
        case 'drilling_injection': return <AreaMarker {...props} />;
        case 'comment_box': return <CommentBoxMarker {...props} />;
        case 'spray_arrow': return <SprayArrowMarker {...props} />;
        case 'agitator_fan': return <IconMarker {...props} Icon={AgitatorFanIcon} />;
        case 'blower_fan': return <IconMarker {...props} Icon={BlowerFanIcon} color={marker.rotation !== undefined ? 'text-indigo-600' : undefined} />;
        case 'timer': return <IconMarker {...props} Icon={TimerIcon} />;
        case 'bamboo_charcoal': return (
            <div className={`bg-gray-800 text-white rounded px-2 py-1 text-[11px] font-black whitespace-nowrap shadow-md ${props.isPreview ? 'opacity-40' : ''}`}>竹炭</div>
        );
        default: 
            if (marker.type.startsWith('text_')) {
                const s = props.previewSize
                    ? (props.previewSize / GRID_BASE_UNIT)
                    : getRenderUnit(props.scale, props.isGridMode, props.gridSize);
                const modeS = props.uiMode === 'field' ? 1.6 : 1.0;
                const fontSize = props.isGridMode && props.gridSize && !props.previewSize 
                    ? props.gridSize * 0.5 * modeS
                    : 12 * s * modeS;
                return (
                    <div 
                        className={`font-black whitespace-nowrap select-none text-gray-950 flex items-center justify-center ${props.isPreview ? 'opacity-40' : ''}`} 
                        style={{ 
                            fontSize: `${fontSize}px`,
                            lineHeight: 1,
                            transform: 'none',
                            transformOrigin: 'center center',
                            textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 0 2px 0 #fff, 0 -2px 0 #fff'
                        }}
                    >
                        {MARKER_DEFINITIONS[marker.type].label}
                    </div>
                );
            }
            return <PointIconMarker {...props} label="?" color="text-gray-400" />;
    }
};

export const MarkerDisplay: React.FC<{ marker: Marker; containerWidth: number; previewSize?: number }> = ({ marker, containerWidth, previewSize }) => {
    const scale = containerWidth / BASE_CONTAINER_WIDTH; 
    return <MarkerRenderer marker={marker} scale={scale} isGridMode={false} previewSize={previewSize} />;
};

export const InteractiveMarker: React.FC<{
    marker: Marker;
    toolMode: 'pan' | 'draw';
    isSelected: boolean;
    onSelect: (id: string | null) => void;
    onUpdateMarker: (id: string, updates: Partial<Marker>) => void;
    onDragStart: () => void;
    onDragEnd: (hasDragged?: boolean) => void;
    isDrawing: boolean;
    isPhotographyMode: boolean;
    containerWidth: number;
    floorPlanAspectRatio: number | null;
    isGridMode: boolean;
    gridSize: number;
}> = ({
    marker, toolMode, isSelected, onSelect, onUpdateMarker, onDragStart, onDragEnd, isDrawing, isPhotographyMode, containerWidth, floorPlanAspectRatio, isGridMode, gridSize
}) => {
    const { state } = useEditorContext();
    const isInteracting = useRef(false);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const initialMarkerPos = useRef<{ x: number, y: number } | null>(null);
    const hasDragged = useRef(false);

    const logicalHeight = isGridMode ? containerWidth : (containerWidth / (floorPlanAspectRatio || 1));

    const left = `${marker.x * 100}%`;
    const top = `${marker.y * 100}%`;
    
    let widthVal = marker.width !== undefined ? `${marker.width * 100}%` : undefined;
    let heightVal = marker.height !== undefined ? `${marker.height * 100}%` : undefined;

    const def = MARKER_DEFINITIONS[marker.type];
    const isLine = def?.interaction === 'line';
    const isArea = marker.width !== undefined || marker.height !== undefined;
    
    const transformStr = isArea ? 'none' : (isLine ? 'translate(0, -50%)' : 'translate(-50%, -50%)');
    const zIndex = getMarkerZIndex(marker.type, isSelected);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (toolMode !== 'pan' || isDrawing || isPhotographyMode) return;
        
        e.stopPropagation(); 
        isInteracting.current = true;
        hasDragged.current = false;
        startPos.current = { x: e.clientX, y: e.clientY };
        initialMarkerPos.current = { x: marker.x, y: marker.y };
        onDragStart();
        
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isInteracting.current || !startPos.current || !initialMarkerPos.current) return;
        
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        
        // 移動距離が小さい場合はドラッグとみなさない（誤操作防止）
        if (!hasDragged.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        
        hasDragged.current = true;
        
        let newX = initialMarkerPos.current.x + dx / containerWidth;
        let newY = initialMarkerPos.current.y + dy / logicalHeight;
        
        const shouldSnap = def?.shouldSnap;

        if (isGridMode && shouldSnap) {
            const subdivisions = isLine || isArea ? GRID_DRAWING_SUBDIVISIONS : 2;
            newX = snapToGrid(newX, containerWidth, gridSize, subdivisions);
            newY = snapToGrid(newY, logicalHeight, gridSize, subdivisions);
        }
        
        onUpdateMarker(marker.id, { x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isInteracting.current) return;
        isInteracting.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        // クリックとドラッグの厳密な判定
        if (!hasDragged.current) {
            onSelect(marker.id);
        }
        onDragEnd(hasDragged.current);
    };

    const cursorClass = (toolMode === 'draw' || isPhotographyMode) ? 'cursor-crosshair-forced' : (toolMode === 'pan' ? 'cursor-grab' : 'cursor-crosshair-forced');
    const touchPadding = isLine || isArea ? '0px' : (state.uiMode === 'field' ? '20px' : '8px');

    return (
        <div 
            style={{ 
                position: 'absolute', left, top, width: widthVal, height: heightVal, 
                zIndex, 
                transform: transformStr,
                pointerEvents: (toolMode === 'draw' || isPhotographyMode) ? 'none' : 'auto',
                touchAction: 'none',
                padding: touchPadding,
                margin: `-${touchPadding}`
            }} 
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
            className={`group ${cursorClass}`}
        >
            <MarkerRenderer 
                marker={marker} 
                scale={containerWidth / BASE_CONTAINER_WIDTH} 
                isGridMode={isGridMode} 
                gridSize={gridSize} 
                isSelected={isSelected} 
                uiMode={state.uiMode}
            />
        </div>
    );
};
