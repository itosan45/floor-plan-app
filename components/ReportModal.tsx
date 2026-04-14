
import React, { useMemo } from 'react';
import { EditorState } from '../hooks/useEditorState';
import { XMarkIcon, CheckIcon, ClipboardIcon } from './icons';
import { MarkerRenderer } from './Marker';
import { BASE_CONTAINER_WIDTH, MARKER_DEFINITIONS } from '../constants';
import { calculateMarkersBoundingBox, calculateFitAndCenter } from '../utils/geometry';

interface ReportModalProps {
    isOpen: boolean;
    state: EditorState;
    onClose: () => void;
}

/**
 * Page 1: 平面図プロットページ
 */
const FloorPlanPage: React.FC<{
    state: EditorState;
    metrics: { width: number; height: number; scale: number; gridSize: number };
    cropBox: { x: number; y: number; w: number; h: number };
}> = ({ state, metrics, cropBox }) => {
    const { floorPlanImage, markers, isGridMode, gridSize } = state;

    // レポートプレビューの物理サイズ(px相当)を定義
    const containerPx = 700;

    // ユーティリティを使用して拡大率と配置を計算
    const { zoom, offsetX, offsetY } = calculateFitAndCenter(
        cropBox, 
        containerPx, containerPx, // コンテナのアスペクト比 (1:1 正方形)
        metrics.width, metrics.height
    );
    
    const gridStyle = isGridMode ? {
        backgroundImage: `
            linear-gradient(#cbd5e1 1px, transparent 1px), 
            linear-gradient(90deg, #cbd5e1 1px, transparent 1px),
            linear-gradient(#e2e8f0 1px, transparent 1px),
            linear-gradient(90deg, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize / 2}px ${gridSize / 2}px, ${gridSize / 2}px ${gridSize / 2}px`,
        backgroundColor: '#f8fafc'
    } : {};

    return (
        <div className="print-page bg-white w-[210mm] h-[297mm] p-[15mm] mx-auto mb-8 shadow-xl print:shadow-none flex flex-col box-border overflow-hidden relative">
            <div className="border-b-4 border-gray-900 pb-2 mb-4 flex justify-between items-end h-[8%] shrink-0">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter">床下調査報告資料</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Underfloor Inspection & Report</p>
                </div>
                <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-gray-500">作成日: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-4 mb-2 shrink-0 h-[5%]">
                    <span className="text-2xl font-black text-gray-300">01</span>
                    <h3 className="text-lg font-black text-gray-900 border-b-2 border-gray-300 pr-8">現状平面図 / プロット図</h3>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 border border-gray-200 bg-gray-50 rounded-lg min-h-0 overflow-hidden relative">
                    <div id="report-floorplan-preview" className="relative bg-white shadow-sm overflow-hidden" style={{ width: `${containerPx}px`, height: `${containerPx}px` }}>
                        <div className="absolute origin-top-left" style={{ width: `${metrics.width}px`, height: `${metrics.height}px`, transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`, ...gridStyle }}>
                            {floorPlanImage && <img src={floorPlanImage.dataUrl} className="w-full h-full object-contain" alt="Floorplan" />}
                            <div className="absolute inset-0 pointer-events-none">
                                {markers.map(marker => (
                                    <div key={marker.id} style={{
                                        position: 'absolute', left: `${marker.x * 100}%`, top: `${marker.y * 100}%`,
                                        transform: (marker.width || marker.height) ? 'none' : (MARKER_DEFINITIONS[marker.type]?.interaction === 'line' ? 'translate(0, -50%)' : 'translate(-50%, -50%)'),
                                        width: marker.width ? `${marker.width * 100}%` : undefined,
                                        height: marker.height ? `${marker.height * 100}%` : undefined,
                                    }}>
                                        <MarkerRenderer marker={marker} scale={metrics.scale} isGridMode={isGridMode} gridSize={metrics.gridSize} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-2 border-t-2 border-gray-100 flex justify-between items-end text-[9px] text-gray-300 font-black tracking-[0.4em] uppercase h-[4%] shrink-0">
                <div>Property of Inspection Report System</div>
                <div className="text-right">PAGE 01</div>
            </div>
        </div>
    );
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, state, onClose }) => {
    // 境界ボックスの計算をユーティリティへ委譲
    const cropBox = useMemo(() => {
        return calculateMarkersBoundingBox(
            state.markers,
            state.floorPlanWidth,
            state.floorPlanAspectRatio,
            state.gridSize,
            state.isGridMode
        );
    }, [state.markers, state.gridSize, state.floorPlanWidth, state.floorPlanAspectRatio, state.isGridMode]);

    const reportMetrics = useMemo(() => {
        if (!state) return null;
        const width = state.floorPlanWidth; 
        const height = width / (state.floorPlanAspectRatio || 1);
        const scale = width / BASE_CONTAINER_WIDTH;
        return { width, height, scale, gridSize: state.gridSize };
    }, [state?.floorPlanWidth, state?.floorPlanAspectRatio, state?.gridSize]);

    if (!isOpen || !state || !reportMetrics) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in print:p-0 print:static print:bg-white">
            <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden animate-bounce-in print:static print:h-auto print:max-w-none print:shadow-none print:bg-white">
                <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg"><ClipboardIcon className="w-6 h-6 text-gray-700" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">報告資料プレビュー</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Internal Refinement Applied</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.print()} className="px-8 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95">
                            <CheckIcon className="w-5 h-5" /> PDFを出力
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XMarkIcon className="w-7 h-7 text-gray-400" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-gray-200/80 flex flex-col items-center gap-8 print:p-0 print:bg-white print:block custom-scrollbar">
                    <FloorPlanPage state={state} metrics={reportMetrics} cropBox={cropBox} />
                </div>
            </div>
        </div>
    );
};
