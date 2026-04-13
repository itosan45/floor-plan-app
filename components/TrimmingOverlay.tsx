
import React from 'react';
import { Viewport } from '../hooks/useDrawingInteraction';
import { SparklesIcon, CheckIcon, XMarkIcon, Spinner } from './icons';

interface TrimmingOverlayProps {
    viewport: Viewport;
    currentCanvasWidth: number;
    logicalHeight: number;
    trimRect: { x: number; y: number; w: number; h: number } | null;
    drawingTrim: { startX: number; startY: number; currentX: number; currentY: number } | null;
    handleAutoTrim: () => void;
    performCropAndExport: () => void;
    cancelTrimming: () => void;
    isExporting: boolean;
    stopEventPropagation: (e: React.BaseSyntheticEvent) => void;
}

export const TrimmingOverlay: React.FC<TrimmingOverlayProps> = ({
    viewport, currentCanvasWidth, logicalHeight,
    trimRect, drawingTrim,
    handleAutoTrim, performCropAndExport, cancelTrimming,
    isExporting, stopEventPropagation
}) => {
    return (
        <>
            {/* Action Buttons */}
                <div 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4"
                onPointerDown={stopEventPropagation}
            >
                <button onClick={handleAutoTrim} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 font-bold transition-transform active:scale-95">
                    <SparklesIcon className="w-6 h-6" />
                    自動設定
                </button>
                <button onClick={performCropAndExport} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full shadow-xl hover:bg-green-700 disabled:opacity-50 font-bold transition-transform active:scale-95">
                    {isExporting ? <Spinner /> : <CheckIcon className="w-6 h-6" />}
                    保存
                </button>
                <button onClick={cancelTrimming} className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full shadow-xl hover:bg-gray-700 font-bold transition-transform active:scale-95">
                    <XMarkIcon className="w-6 h-6" />
                    キャンセル
                </button>
            </div>
            
            {/* Overlay Darkening */}
            <div 
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-30"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                    width: `${currentCanvasWidth}px`,
                    height: `${logicalHeight}px`,
                }}
            >
                    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50"></div>
                    {/* The "Hole" or Highlighted Area */}
                    {(trimRect || drawingTrim) && (
                    <div 
                        className="absolute border-2 border-white shadow-2xl"
                        style={{
                            left: `${(drawingTrim ? Math.min(drawingTrim.startX, drawingTrim.currentX) : trimRect!.x) * 100}%`,
                            top: `${(drawingTrim ? Math.min(drawingTrim.startY, drawingTrim.currentY) : trimRect!.y) * 100}%`,
                            width: `${(drawingTrim ? Math.abs(drawingTrim.currentX - drawingTrim.startX) : trimRect!.w) * 100}%`,
                            height: `${(drawingTrim ? Math.abs(drawingTrim.currentY - drawingTrim.startY) : trimRect!.h) * 100}%`,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' // Spotlight effect
                        }}
                    >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow">
                                切り抜き範囲
                            </div>
                    </div>
                    )}
            </div>
        </>
    );
};
