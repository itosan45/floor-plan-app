import React, { useMemo, useRef, useState } from 'react';
import { EditorState } from '../hooks/useEditorState';
import { XMarkIcon, CheckIcon, ClipboardIcon, Spinner } from './icons';
import { MarkerRenderer } from './Marker';
import { BASE_CONTAINER_WIDTH, MARKER_DEFINITIONS } from '../constants';
import { calculateMarkersBoundingBox, calculateFitAndCenter } from '../utils/geometry';
import { exportElementsToPdfBlob, saveBlobToDevice } from '../utils/imageProcessing';

interface ReportModalProps {
    isOpen: boolean;
    state: EditorState;
    onClose: () => void;
    onStatus: (text: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}

const PAGE_WIDTH = 820;
const PAGE_HEIGHT = 1160;
const PHOTO_COLUMNS = 3;
const PHOTO_ROWS = 4;
const PHOTOS_PER_PAGE = PHOTO_COLUMNS * PHOTO_ROWS;

const ReportPageShell: React.FC<{
    pageNumber: number;
    title: string;
    children: React.ReactNode;
    innerRef?: (element: HTMLDivElement | null) => void;
}> = ({ pageNumber, title, children, innerRef }) => (
    <div
        ref={innerRef}
        className="report-page bg-white shadow-xl border border-gray-200 overflow-hidden"
        style={{ width: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px` }}
    >
        <div className="flex h-full flex-col px-10 py-10">
            <div className="flex h-20 items-end justify-between border-b-4 border-gray-900 pb-3">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter text-gray-900">床下調査報告資料</h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">Underfloor Inspection Ledger</p>
                </div>
                <div className="text-right text-xs font-bold text-gray-500">
                    作成日: {new Date().toLocaleDateString('ja-JP')}
                </div>
            </div>

            <div className="mb-5 mt-5 flex items-center gap-4">
                <span className="text-3xl font-black text-gray-300">{String(pageNumber).padStart(2, '0')}</span>
                <h3 className="border-b-2 border-gray-300 pr-8 text-xl font-black text-gray-900">{title}</h3>
            </div>

            <div className="flex-1">{children}</div>

            <div className="mt-4 flex h-10 items-end justify-between border-t-2 border-gray-100 text-[10px] font-black uppercase tracking-[0.35em] text-gray-300">
                <div className="pt-3">Property of Inspection Report System</div>
                <div className="pt-3">Page {String(pageNumber).padStart(2, '0')}</div>
            </div>
        </div>
    </div>
);

const FloorPlanPage: React.FC<{
    state: EditorState;
    metrics: { width: number; height: number; scale: number; gridSize: number };
    cropBox: { x: number; y: number; w: number; h: number };
    pageNumber: number;
}> = ({ state, metrics, cropBox, pageNumber }) => {
    const { floorPlanImage, markers, isGridMode, gridSize } = state;
    const containerWidth = 720;
    const containerHeight = 880;
    const { zoom, offsetX, offsetY } = calculateFitAndCenter(
        cropBox,
        containerWidth,
        containerHeight,
        metrics.width,
        metrics.height
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
        <ReportPageShell pageNumber={pageNumber} title="現状平面図 / プロット図">
            <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="relative overflow-hidden rounded-xl bg-white shadow-sm" style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}>
                    <div
                        className="absolute origin-top-left"
                        style={{
                            width: `${metrics.width}px`,
                            height: `${metrics.height}px`,
                            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                            ...gridStyle
                        }}
                    >
                        {floorPlanImage && <img src={floorPlanImage.dataUrl} className="h-full w-full object-contain" alt="Floorplan" />}
                        <div className="absolute inset-0 pointer-events-none">
                            {markers.map(marker => (
                                <div
                                    key={marker.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${marker.x * 100}%`,
                                        top: `${marker.y * 100}%`,
                                        transform: (marker.width || marker.height)
                                            ? 'none'
                                            : (MARKER_DEFINITIONS[marker.type]?.interaction === 'line' ? 'translate(0, -50%)' : 'translate(-50%, -50%)'),
                                        width: marker.width ? `${marker.width * 100}%` : undefined,
                                        height: marker.height ? `${marker.height * 100}%` : undefined,
                                    }}
                                >
                                    <MarkerRenderer marker={marker} scale={metrics.scale} isGridMode={isGridMode} gridSize={metrics.gridSize} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ReportPageShell>
    );
};

const PhotoLedgerPage: React.FC<{
    photos: Array<{ id: string; label: string; dataUrl: string; timestamp?: string }>;
    pageNumber: number;
}> = ({ photos, pageNumber }) => {
    const slots = Array.from({ length: PHOTOS_PER_PAGE }, (_, index) => photos[index] ?? null);

    return (
        <ReportPageShell pageNumber={pageNumber} title="撮影写真台帳">
            <div className="grid h-full grid-cols-3 gap-4">
                {slots.map((photo, index) => (
                    <div key={`photo-slot-${index}`} className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>Photo {String(index + 1).padStart(2, '0')}</span>
                            {photo?.timestamp && <span className="tracking-normal">{photo.timestamp}</span>}
                        </div>
                        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
                            {photo ? (
                                <img src={photo.dataUrl} alt={photo.label} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs font-bold text-gray-300">
                                    No Photo
                                </div>
                            )}
                        </div>
                        <div className="mt-2 min-h-[40px] rounded-lg bg-white px-3 py-2 text-center text-xs font-black leading-tight text-gray-800">
                            {photo?.label || '未登録'}
                        </div>
                    </div>
                ))}
            </div>
        </ReportPageShell>
    );
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, state, onClose, onStatus }) => {
    const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

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
        const width = state.floorPlanWidth;
        const height = width / (state.floorPlanAspectRatio || 1);
        const scale = width / BASE_CONTAINER_WIDTH;
        return { width, height, scale, gridSize: state.gridSize };
    }, [state.floorPlanWidth, state.floorPlanAspectRatio, state.gridSize]);

    const placedPhotos = useMemo(() => {
        return state.markers
            .filter((marker): marker is typeof marker & { photoId: string } => marker.type === 'photo' && typeof marker.photoId === 'string')
            .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
            .map(marker => state.photoLibrary[marker.photoId])
            .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))
            .map(photo => ({
                id: photo.id,
                label: photo.label || '未登録',
                dataUrl: photo.dataUrl,
                timestamp: photo.timestamp,
            }));
    }, [state.markers, state.photoLibrary]);

    const photoPages = useMemo(() => {
        const pages: Array<Array<{ id: string; label: string; dataUrl: string; timestamp?: string }>> = [];
        for (let i = 0; i < placedPhotos.length; i += PHOTOS_PER_PAGE) {
            pages.push(placedPhotos.slice(i, i + PHOTOS_PER_PAGE));
        }
        return pages;
    }, [placedPhotos]);

    const totalPages = 1 + Math.max(1, photoPages.length || 0);

    const handleExportPdf = async () => {
        try {
            const elements = pageRefs.current.filter((element): element is HTMLDivElement => Boolean(element));
            if (elements.length === 0) {
                throw new Error('PDF出力対象がありません');
            }

            setIsExportingPdf(true);
            onStatus('PDF台帳を生成中...', 'info', 12000);
            const pdfBlob = await exportElementsToPdfBlob(elements);
            const fileName = `floor_plan_ledger_${Date.now()}.pdf`;
            const saved = await saveBlobToDevice(pdfBlob, fileName);
            onStatus(saved.mode === 'native'
                ? `PDF台帳を保存しました: ${fileName}`
                : 'PDF台帳を保存しました', 'success', 5000);
        } catch (error) {
            console.error('PDF export error:', error);
            onStatus('PDF台帳の保存に失敗しました', 'error', 5000);
        } finally {
            setIsExportingPdf(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
            <div className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl animate-bounce-in">
                <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gray-100 p-2"><ClipboardIcon className="h-6 w-6 text-gray-700" /></div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-800">報告資料プレビュー</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {totalPages}ページ / 写真 {placedPhotos.length} 枚
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => void handleExportPdf()}
                            disabled={isExportingPdf}
                            className="flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-2.5 font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isExportingPdf ? <Spinner className="h-5 w-5" /> : <CheckIcon className="h-5 w-5" />}
                            PDF台帳を保存
                        </button>
                        <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-200">
                            <XMarkIcon className="h-7 w-7 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto bg-gray-200/80 p-8">
                    <div className="flex flex-col items-center gap-8">
                        <FloorPlanPage
                            state={state}
                            metrics={reportMetrics}
                            cropBox={cropBox}
                            pageNumber={1}
                        />
                        <div className="pointer-events-none fixed left-[-20000px] top-0 opacity-100">
                            <div ref={(element) => { pageRefs.current[0] = element; }}>
                                <FloorPlanPage
                                    state={state}
                                    metrics={reportMetrics}
                                    cropBox={cropBox}
                                    pageNumber={1}
                                />
                            </div>
                            {(photoPages.length > 0 ? photoPages : [[]]).map((pagePhotos, index) => (
                                <div key={`pdf-page-${index + 2}`} ref={(element) => { pageRefs.current[index + 1] = element; }}>
                                    <PhotoLedgerPage photos={pagePhotos} pageNumber={index + 2} />
                                </div>
                            ))}
                        </div>
                        {(photoPages.length > 0 ? photoPages : [[]]).map((pagePhotos, index) => (
                            <PhotoLedgerPage key={`preview-page-${index + 2}`} photos={pagePhotos} pageNumber={index + 2} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
