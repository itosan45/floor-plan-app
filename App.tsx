
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { useEditorState } from './hooks/useEditorState';
import { Sidebar } from './components/Sidebar';
import { EditorCanvas } from './components/EditorCanvas';
import { WelcomeScreen, FloatingToolbar, OrientationWarning } from './components/EditorControls';
import { HelpModal } from './components/HelpModal';
import { ReportModal } from './components/ReportModal';
import { CameraModal } from './components/CameraModal';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { TutorialOverlay, ImagePreviewModal, ConfirmTransitionModal, VoiceTranscriptOverlay } from './components/Modals';

import { generateUniqueId } from './utils/common';
import { resizeImage, loadHtml2Canvas, captureAndGenerateA4 } from './utils/imageProcessing';
import { calculateMarkersBoundingBox } from './utils/geometry';
import { useDrawingInteraction } from './hooks/useDrawingInteraction';
import { useVoiceInteraction } from './hooks/useVoiceInteraction';
import { APP_INFO, GRID_CELL_COUNT } from './constants';

type UpdateInfo = { version: string; downloadUrl: string };

const normalizeVersion = (version: string) => version.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0);
const isVersionNewer = (candidate: string, current: string) => {
    const candidateParts = normalizeVersion(candidate);
    const currentParts = normalizeVersion(current);
    const maxLength = Math.max(candidateParts.length, currentParts.length);
    for (let i = 0; i < maxLength; i += 1) {
        const candidatePart = candidateParts[i] ?? 0;
        const currentPart = currentParts[i] ?? 0;
        if (candidatePart > currentPart) return true;
        if (candidatePart < currentPart) return false;
    }
    return false;
};

export const App: React.FC = () => {
    const { state, actions } = useEditorState();
    const floorPlanRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
    const [gridDataUrl, setGridDataUrl] = useState('');
    const [showOrientationWarning, setShowOrientationWarning] = useState(false);
    const [tempImageData, setTempImageData] = useState<{ dataUrl: string, blob: Blob } | null>(null);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    const prepareFloorPlanPreview = useCallback(async (blob: Blob) => {
        const extension = blob.type.includes('png') ? 'png' : 'jpg';
        const file = new File([blob], `floor-plan-capture.${extension}`, {
            type: blob.type || 'image/jpeg',
            lastModified: Date.now(),
        });
        const { dataUrl, blob: resizedBlob } = await resizeImage(file);
        setTempImageData({ dataUrl, blob: resizedBlob });
    }, []);

    const handleCaptureFloorPlan = useCallback(async () => {
        try {
            await Camera.requestPermissions({ permissions: ['camera'] });
            const result = await Camera.takePhoto({
                quality: 90,
                saveToGallery: false,
                correctOrientation: true,
                editable: 'no',
            });

            const assetUrl = result.webPath ?? result.uri;
            if (!assetUrl) {
                throw new Error('撮影画像の取得に失敗しました');
            }

            const response = await fetch(assetUrl);
            if (!response.ok) {
                throw new Error('撮影画像の読み込みに失敗しました');
            }

            const blob = await response.blob();
            await prepareFloorPlanPreview(blob);
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (!/cancel/i.test(message)) {
                console.error('Floor plan capture error:', error);
                actions.showStatus('図面撮影の起動に失敗しました', 'error');
            }
        }
    }, [actions, prepareFloorPlanPreview]);

    const handlePickFloorPlanFromGallery = useCallback(async () => {
        try {
            await Camera.requestPermissions({ permissions: ['photos'] });
            const result = await Camera.chooseFromGallery({
                mediaType: MediaTypeSelection.Photo,
                allowMultipleSelection: false,
                editable: 'no',
                quality: 90,
            });

            const firstResult = result.results[0];
            const assetUrl = firstResult?.webPath ?? firstResult?.uri;
            if (!assetUrl) {
                throw new Error('選択画像の取得に失敗しました');
            }

            const response = await fetch(assetUrl);
            if (!response.ok) {
                throw new Error('選択画像の読み込みに失敗しました');
            }

            const blob = await response.blob();
            await prepareFloorPlanPreview(blob);
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (!/cancel/i.test(message)) {
                console.error('Floor plan gallery import error:', error);
                actions.showStatus('画像の読み込みに失敗しました', 'error');
            }
        }
    }, [actions, prepareFloorPlanPreview]);

    const handleUpdateApp = useCallback(() => {
        if (!updateInfo?.downloadUrl) return;
        const opened = window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
            window.location.href = updateInfo.downloadUrl;
        }
    }, [updateInfo]);

    const { 
        floorPlanImage, floorPlanRotation, isGridMode, appMode, activeModal, markers,
        floorPlanAspectRatio, floorPlanWidth, gridSize, uiMode,
        currentLineThickness, currentLineColor,
        activePhotoIndex, workflowStep, tutorialStep
    } = state;

    const placedPhotos = useMemo(() => {
        return markers
            .filter((marker): marker is typeof marker & { photoId: string } => marker.type === 'photo' && typeof marker.photoId === 'string')
            .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
            .map(marker => state.photoLibrary[marker.photoId])
            .filter((photo): photo is NonNullable<typeof photo> => !!photo);
    }, [markers, state.photoLibrary]);

    const fitToScreen = useCallback(() => {
        if (!containerRef.current || (!floorPlanImage && !isGridMode)) return;

        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const isRotated90 = floorPlanRotation % 180 !== 0;
        const contentW = floorPlanWidth;
        const contentH = contentW / (floorPlanAspectRatio || 1);
        const displayW = isRotated90 ? contentH : contentW;
        const displayH = isRotated90 ? contentW : contentH;

        const scaleX = (containerW * 0.9) / displayW;
        const scaleY = (containerH * 0.9) / displayH;
        const scale = Math.min(scaleX, scaleY);
        const x = (containerW - displayW * scale) / 2;
        const y = (containerH - displayH * scale) / 2;

        setViewport({ x, y, scale });
    }, [floorPlanImage, floorPlanRotation, floorPlanAspectRatio, floorPlanWidth, isGridMode]);

    useEffect(() => {
        if (!containerRef.current || (!floorPlanImage && !isGridMode)) return;

        const observer = new ResizeObserver(() => {
            fitToScreen();
        });

        observer.observe(containerRef.current);
        
        // Initial fit
        const timer = setTimeout(fitToScreen, 50);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [floorPlanImage, floorPlanRotation, isGridMode, fitToScreen]);

    useEffect(() => {
        const checkOrientation = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            const isMobile = window.innerWidth < 768;
            setShowOrientationWarning(isPortrait && isMobile);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const checkForUpdate = async () => {
            setIsCheckingUpdate(true);
            try {
                const response = await fetch(APP_INFO.RELEASES_API_URL, {
                    headers: { 'User-Agent': 'FloorPlanEditorApp' },
                });
                if (!response.ok) return;

                const release = await response.json() as {
                    tag_name?: string;
                    assets?: Array<{ browser_download_url?: string; name?: string }>;
                };
                const latestVersion = release.tag_name;
                const apkAsset = release.assets?.find(asset => asset.name?.endsWith('.apk') && asset.browser_download_url);

                if (!isCancelled && latestVersion && apkAsset?.browser_download_url && isVersionNewer(latestVersion, APP_INFO.VERSION)) {
                    setUpdateInfo({
                        version: latestVersion,
                        downloadUrl: apkAsset.browser_download_url,
                    });
                }
            } catch (error) {
                console.error('Update check failed:', error);
            } finally {
                if (!isCancelled) {
                    setIsCheckingUpdate(false);
                }
            }
        };

        void checkForUpdate();
        return () => {
            isCancelled = true;
        };
    }, []);

    const { startVoice, stopVoice, transcript } = useVoiceInteraction({
        onInspectionResult: (data) => {
            actions.showStatus(`認識: ${data.location}`, 'success', 2000);
            actions.addMarker({
                id: generateUniqueId(),
                type: 'comment_box', x: 0.5, y: 0.5,
                text: `${data.location}\n(${data.direction})\n${data.status}`,
                color: data.status.includes('シロアリ') || data.status.includes('被害') ? '#ef4444' : '#3b82f6'
            });
        },
        onError: (msg) => actions.showStatus(msg, 'error')
    });

    useEffect(() => {
        if (appMode === 'inspection-voice') {
            startVoice('inspection');
        } else {
            stopVoice();
        }
    }, [appMode]);

    useEffect(() => {
        if (!isGridMode) return;
        const canvas = document.createElement('canvas');
        canvas.width = gridSize; canvas.height = gridSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 2]); ctx.beginPath();
            const half = gridSize / 2; ctx.moveTo(half, 0); ctx.lineTo(half, gridSize); ctx.moveTo(0, half); ctx.lineTo(gridSize, half); ctx.stroke();
            ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath(); 
            ctx.moveTo(0, 0); ctx.lineTo(0, gridSize); ctx.moveTo(0, 0); ctx.lineTo(gridSize, 0); ctx.stroke();
            setGridDataUrl(canvas.toDataURL());
        }
    }, [isGridMode, gridSize]);

    const currentCanvasWidth = floorPlanWidth;
    const logicalHeight = currentCanvasWidth / (floorPlanAspectRatio || 1);

    const { 
        drawingLineInfo, drawingPhotoMarkerInfo, 
        handlePointerStart, handlePointerMove, handlePointerEnd 
    } = useDrawingInteraction({
        floorPlanRef, viewport, setViewport, toolMode: appMode === 'pan' ? 'pan' : 'draw', 
        currentMarkerType: state.currentMarkerType, isGridMode, gridSize, currentCanvasWidth, logicalHeight, 
        currentLineThickness, currentLineColor, markers, addMarker: actions.addMarker, 
        setSelectedMarkerId: actions.setSelectedMarkerId, showStatus: actions.showStatus, 
        isPhotographyMode: appMode.startsWith('inspection'), isManualCameraMode: appMode === 'inspection-manual',
        selectedPhotoId: state.selectedPhotoId,
        onPhotoMarkerPlaced: (data: { x: number, y: number, rotation: number, length: number }) => {
            actions.setCameraTapPosition(data);
            actions.setActiveModal('camera');
        }
    });

    const handleZoom = (delta: number) => setViewport(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, prev.scale + delta)) }));
    const performCropAndExport = useCallback(async () => {
        if (!floorPlanRef.current) return;
        actions.setIsExporting(true);
        actions.showStatus("JPEGファイルを生成中...", "info");
        try {
            await loadHtml2Canvas();
            const cropRect = calculateMarkersBoundingBox(markers, currentCanvasWidth, floorPlanAspectRatio, gridSize, isGridMode);
            await captureAndGenerateA4(floorPlanRef.current, cropRect);
            actions.showStatus("JPEGエクスポート完了", "success");
        } catch {
            actions.showStatus("エクスポートに失敗しました", "error");
        } finally {
            actions.setIsExporting(false);
        }
    }, [markers, currentCanvasWidth, floorPlanAspectRatio, gridSize, isGridMode, actions]);

    useEffect(() => {
        if (workflowStep === 'floor_drafting') {
            actions.setAppMode('draw'); actions.setCurrentMarkerType('rectangle_outline'); actions.setActiveTab('construction');
        } else if (workflowStep === 'entry_setup') {
            actions.setAppMode('draw'); actions.setCurrentMarkerType('access_point'); actions.setActiveTab('inspection');
        } else if (workflowStep === 'underfloor') {
            actions.setAppMode(uiMode === 'field' ? 'inspection-voice' : 'inspection-manual'); actions.setActiveTab('inspection');
        }
    }, [workflowStep, uiMode, actions.setAppMode, actions.setCurrentMarkerType, actions.setActiveTab]);

    useEffect(() => {
        if (placedPhotos.length === 0 && activePhotoIndex !== 0) {
            actions.setActivePhotoIndex(0);
            return;
        }

        if (placedPhotos.length > 0 && activePhotoIndex >= placedPhotos.length) {
            actions.setActivePhotoIndex(placedPhotos.length - 1);
        }
    }, [placedPhotos.length, activePhotoIndex, actions]);

    if (showOrientationWarning) return <OrientationWarning onForceLandscape={() => setShowOrientationWarning(false)} />;

    if (workflowStep === 'preparation' && !floorPlanImage && !isGridMode) {
        return (
            <>
                <WelcomeScreen 
                    state={state}
                    actions={actions}
                    onFileChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        if (file.name.endsWith('.json')) return actions.importStateFromJson(file);
                        const { dataUrl, blob } = await resizeImage(file);
                        setTempImageData({ dataUrl, blob });
                    }} 
                    onCaptureFloorPlan={() => { void handleCaptureFloorPlan(); }}
                    onPickFloorPlanFromGallery={() => { void handlePickFloorPlanFromGallery(); }}
                    onStartWithGrid={() => {
                        actions.setIsGridMode(true); actions.setFloorPlanWidth(1200);
                        actions.setFloorPlanAspectRatio(1); actions.setGridSize(1200 / GRID_CELL_COUNT); actions.setWorkflowStep('floor_drafting');
                    }}
                    onStartTutorial={actions.startTutorial}
                    toggleFullscreen={actions.toggleFullscreen} isFullscreen={state.isFullscreen}
                    onOpenHelp={() => actions.setActiveModal('help')}
                    updateInfo={updateInfo}
                    onUpdateApp={handleUpdateApp}
                    isCheckingUpdate={isCheckingUpdate}
                />
                {tempImageData && (
                    <ImagePreviewModal 
                        dataUrl={tempImageData.dataUrl} 
                        onCancel={() => setTempImageData(null)}
                        onConfirm={(rotation) => {
                            const img = new Image();
                            img.onload = () => {
                                actions.setFloorPlanImage({ id: generateUniqueId(), dataUrl: tempImageData.dataUrl, blob: tempImageData.blob, label: '床面図' });
                                actions.setFloorPlanRotation(rotation); actions.setFloorPlanAspectRatio(img.width / img.height);
                                actions.setFloorPlanWidth(img.width);
                                // フィールドモードなら即座に点検（床下）へ。オフィスモードなら製図へ。
                                actions.setWorkflowStep(uiMode === 'field' ? 'underfloor' : 'floor_drafting');
                                setTempImageData(null);
                            };
                            img.src = tempImageData.dataUrl;
                        }}
                    />
                )}
                <HelpModal isOpen={activeModal === 'help'} onClose={() => actions.setActiveModal('none')} />
            </>
        );
    }

    return (
        <div className={`flex h-screen bg-gray-950 text-white overflow-hidden font-sans ${uiMode === 'field' ? 'field-mode' : 'office-mode'}`}>
            <Sidebar state={state} actions={actions} markerActions={{ removeMarker: actions.removeMarker, updateMarker: actions.updateMarker }} performCropAndExport={performCropAndExport} />
            <main className="flex-1 relative flex flex-col overflow-hidden">
                {tutorialStep !== 'none' && <TutorialOverlay step={tutorialStep} onNext={() => {
                    if (tutorialStep === 'welcome') actions.setTutorialStep('place_access');
                    else if (tutorialStep === 'finish') actions.resetEditor();
                    else actions.setTutorialStep('none');
                }} />}
                {activeModal === 'confirm-transition' && <ConfirmTransitionModal onConfirm={() => { actions.setWorkflowStep('entry_setup'); actions.setActiveModal('none'); }} onCancel={() => actions.setActiveModal('none')} />}
                <EditorCanvas 
                    floorPlanRef={floorPlanRef} containerRef={containerRef} viewport={viewport}
                    currentCanvasWidth={currentCanvasWidth} logicalHeight={logicalHeight}
                    isGridMode={isGridMode} gridDataUrl={gridDataUrl} floorPlanImage={floorPlanImage}
                    markers={markers} state={state} floorPlanAspectRatio={floorPlanAspectRatio}
                    drawingPhotoMarkerInfo={drawingPhotoMarkerInfo} drawingLineInfo={drawingLineInfo}
                    updateMarker={actions.updateMarker} setSelectedMarkerId={actions.setSelectedMarkerId}
                    removeMarker={actions.removeMarker} onPointerDown={handlePointerStart}
                    onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd}
                />
                <FloatingToolbar state={state} actions={actions} handleZoom={handleZoom} resetView={fitToScreen} stopEventPropagation={(e) => e.stopPropagation()} removeLastMarker={actions.removeLastMarker} hasMarkers={markers.length > 0} />
            </main>
            <HelpModal isOpen={activeModal === 'help'} onClose={() => actions.setActiveModal('none')} />
            <ReportModal isOpen={activeModal === 'report'} state={state} onClose={() => actions.setActiveModal('none')} />
            <CameraModal
                isOpen={activeModal === 'camera'}
                onClose={() => {
                    actions.setActiveModal('none');
                    actions.setCameraTapPosition(null);
                }}
                photoCount={placedPhotos.length}
                onCapture={actions.addCapturedPhoto}
            />
            <PhotoViewerModal
                isOpen={activeModal === 'photo-viewer'}
                photos={placedPhotos}
                markers={markers}
                activeIndex={activePhotoIndex}
                floorPlanImage={floorPlanImage}
                floorPlanAspectRatio={floorPlanAspectRatio}
                onClose={() => actions.setActiveModal('none')}
                onNext={() => actions.setActivePhotoIndex((activePhotoIndex + 1) % placedPhotos.length)}
                onPrev={() => actions.setActivePhotoIndex((activePhotoIndex - 1 + placedPhotos.length) % placedPhotos.length)}
            />
            <VoiceTranscriptOverlay transcript={transcript} />
        </div>
    );
};
