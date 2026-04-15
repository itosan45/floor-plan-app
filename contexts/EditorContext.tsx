
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Marker, MarkerType, Photo, WorkflowStep, TutorialStep } from '../types';
import { GRID_CELL_COUNT, MarkerCategory } from '../constants';
import { useMarkers } from '../hooks/useMarkers';
import { generateUniqueId } from '../utils/common';
import { resizeImage } from '../utils/imageProcessing';

export type AppMode = 'pan' | 'draw' | 'inspection-voice' | 'inspection-manual';
export type ActiveModal = 'none' | 'help' | 'report' | 'camera' | 'photo-viewer' | 'confirm-transition';
export type UiMode = 'office' | 'field';
type CameraPlacement = { x: number; y: number; rotation: number; length: number };

export interface EditorState {
    workflowStep: WorkflowStep;
    tutorialStep: TutorialStep;
    uiMode: UiMode;
    isGridPanelOpen: boolean;
    isFullscreen: boolean;
    activeModal: ActiveModal;
    appMode: AppMode;
    activeTab: MarkerCategory;
    currentMarkerType: MarkerType;
    gridSize: number;
    currentLineThickness: number;
    currentLineColor: string;
    cameraTapPosition: CameraPlacement | null;
    activePhotoIndex: number;
    selectedMarkerId: string | null;
    isTrimming: boolean;
    isExporting: boolean;
    statusMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
    floorPlanImage: Photo | null;
    floorPlanRotation: number;
    floorPlanWidth: number;
    floorPlanAspectRatio: number | null;
    isGridMode: boolean;
    markers: Marker[];
    capturedPhotos: Photo[]; 
    photoLibrary: Record<string, Photo>;
    pendingPhotoIds: string[];
    selectedPhotoId: string | null;
    narration: {
        persona: 'female' | 'male' | 'child';
        speed: number;
        bgmUrl: string | null;
        bgmFileName: string | null;
        bgmVolume: number;
    };
}

export interface EditorActions {
    setWorkflowStep: (step: WorkflowStep) => void;
    setTutorialStep: (step: TutorialStep) => void;
    setUiMode: (mode: UiMode) => void;
    nextStep: () => void;
    setIsGridPanelOpen: (open: boolean) => void;
    toggleFullscreen: () => void;
    setActiveModal: (modal: ActiveModal) => void;
    setAppMode: (mode: AppMode) => void;
    setActiveTab: (tab: MarkerCategory) => void;
    setCurrentMarkerType: (type: MarkerType) => void;
    setGridSize: (size: number) => void;
    setCurrentLineThickness: (val: number) => void;
    setCurrentLineColor: (color: string) => void;
    setCameraTapPosition: (pos: CameraPlacement | null) => void;
    addCapturedPhoto: (photo: Photo) => void;
    setActivePhotoIndex: (index: number) => void;
    setSelectedMarkerId: (id: string | null) => void;
    setIsTrimming: (trimming: boolean) => void;
    setIsExporting: (exporting: boolean) => void;
    showStatus: (text: string, type: 'success' | 'error' | 'info', duration?: number) => void;
    setFloorPlanImage: (image: Photo | null) => void;
    setFloorPlanRotation: (rotation: number) => void;
    setFloorPlanWidth: (width: number) => void;
    setFloorPlanAspectRatio: (ratio: number | null) => void;
    setIsGridMode: (isGrid: boolean) => void;
    addMarker: (marker: Marker) => void;
    updateMarker: (id: string, updates: Partial<Marker>) => void;
    removeMarker: (id: string) => void;
    removeLastMarker: () => void;
    clearMarkers: () => void;
    setMarkers: (markers: Marker[]) => void;
    exportStateToJson: () => void;
    importStateFromJson: (file: File) => Promise<void>;
    resetEditor: () => void;
    addPhotosToLibrary: (files: FileList | File[]) => Promise<void>;
    setSelectedPhotoId: (id: string | null) => void;
    updatePhotoLabel: (id: string, label: string) => void;
    startTutorial: () => void;
    setNarrationSettings: (settings: Partial<EditorState['narration']>) => void;
}

const EditorContext = createContext<{ state: EditorState; actions: EditorActions } | null>(null);

const dedupeIds = (ids: string[]) => Array.from(new Set(ids));
const DEFAULT_GRID_CANVAS_WIDTH = 1200;
const DEFAULT_GRID_SIZE = DEFAULT_GRID_CANVAS_WIDTH / GRID_CELL_COUNT;

const sanitizeImportedPhoto = (photo: unknown): Photo | null => {
    if (!photo || typeof photo !== 'object') return null;

    const candidate = photo as Partial<Photo>;
    if (typeof candidate.id !== 'string' || typeof candidate.dataUrl !== 'string') return null;
    if (!candidate.dataUrl.startsWith('data:image/')) return null;

    return {
        id: candidate.id,
        dataUrl: candidate.dataUrl,
        label: typeof candidate.label === 'string' ? candidate.label : '写真',
        direction: candidate.direction,
        timestamp: typeof candidate.timestamp === 'string' ? candidate.timestamp : undefined,
        markerId: typeof candidate.markerId === 'string' ? candidate.markerId : undefined,
    };
};

const sanitizeImportedPhotoLibrary = (value: unknown) => {
    const nextPhotoLibrary: Record<string, Photo> = {};
    let skippedCount = 0;

    if (!value || typeof value !== 'object') {
        return { nextPhotoLibrary, skippedCount };
    }

    Object.entries(value as Record<string, unknown>).forEach(([id, photo]) => {
        const sanitized = sanitizeImportedPhoto(photo);
        if (sanitized) {
            nextPhotoLibrary[id] = sanitized;
        } else {
            skippedCount += 1;
        }
    });

    return { nextPhotoLibrary, skippedCount };
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('preparation');
    const [tutorialStep, setTutorialStep] = useState<TutorialStep>('none');
    const [uiMode, setUiMode] = useState<UiMode>('office');
    const [isGridPanelOpen, setIsGridPanelOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeModal, setActiveModal] = useState<ActiveModal>('none');
    const [appMode, setAppMode] = useState<AppMode>('pan');
    const [activeTab, setActiveTab] = useState<MarkerCategory>('inspection');
    const [currentMarkerType, setCurrentMarkerType] = useState<MarkerType>('rectangle_outline');
    const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
    const [currentLineThickness, setCurrentLineThickness] = useState<number>(5);
    const [currentLineColor, setCurrentLineColor] = useState<string>('#0044cc');
    const [cameraTapPosition, setCameraTapPosition] = useState<CameraPlacement | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<Photo[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [isTrimming, setIsTrimming] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [floorPlanImage, setFloorPlanImage] = useState<Photo | null>(null);
    const [floorPlanRotation, setFloorPlanRotation] = useState<number>(0);
    const [floorPlanWidth, setFloorPlanWidth] = useState<number>(1000);
    const [floorPlanAspectRatio, setFloorPlanAspectRatio] = useState<number | null>(null);
    const [isGridMode, setIsGridMode] = useState(false);
    const [photoLibrary, setPhotoLibrary] = useState<Record<string, Photo>>({});
    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
    const [selectedPhotoId, _setSelectedPhotoId] = useState<string | null>(null);
    const [narration, setNarration] = useState<EditorState['narration']>({
        persona: 'female',
        speed: 1.0,
        bgmUrl: null,
        bgmFileName: null,
        bgmVolume: 0.2
    });
    
    const { markers, addMarker: baseAddMarker, updateMarker, removeMarker: baseRemoveMarker, removeLastMarker: baseRemoveLastMarker, clearMarkers, setMarkers } = useMarkers();

    const showStatus = useCallback((text: string, type: 'success' | 'error' | 'info', duration = 3000) => {
        setStatusMessage({ text, type });
        setTimeout(() => setStatusMessage(null), duration);
    }, []);

    const resetEditor = useCallback(() => {
        setWorkflowStep('preparation');
        setTutorialStep('none');
        setUiMode('office');
        setIsGridPanelOpen(false);
        setFloorPlanImage(null);
        setFloorPlanRotation(0);
        setFloorPlanWidth(1000);
        setFloorPlanAspectRatio(null);
        setIsGridMode(false);
        setGridSize(DEFAULT_GRID_SIZE);
        setCurrentLineThickness(5);
        setCurrentLineColor('#0044cc');
        clearMarkers();
        setCameraTapPosition(null);
        setCapturedPhotos([]);
        setActivePhotoIndex(0);
        setSelectedMarkerId(null);
        setIsTrimming(false);
        setIsExporting(false);
        setStatusMessage(null);
        setPhotoLibrary({});
        setPendingPhotoIds([]);
        _setSelectedPhotoId(null);
        setAppMode('pan');
        setActiveTab('inspection');
        setCurrentMarkerType('rectangle_outline');
        setActiveModal('none');
    }, [clearMarkers]);

    const startTutorial = useCallback(() => {
        resetEditor();
        setUiMode('field');
        setIsGridMode(true);
        setFloorPlanWidth(DEFAULT_GRID_CANVAS_WIDTH);
        setFloorPlanAspectRatio(1);
        setGridSize(DEFAULT_GRID_SIZE);
        setWorkflowStep('floor_drafting');
        setTutorialStep('welcome');
    }, [resetEditor]);

    const nextStep = useCallback(() => {
        const steps: WorkflowStep[] = ['preparation', 'floor_drafting', 'entry_setup', 'underfloor', 'completion'];
        const currentIndex = steps.indexOf(workflowStep);
        if (currentIndex < steps.length - 1) {
            setWorkflowStep(steps[currentIndex + 1]);
        }
    }, [workflowStep]);

    const addPhotosToLibrary = useCallback(async (files: FileList | File[]) => {
        const fileList = Array.from(files);
        if (fileList.length === 0) return;

        const startedAt = Date.now();
        showStatus(`0 / ${fileList.length} 枚の写真を読み込み中... 0秒`, "info", 15000);
        const newIds: string[] = [];
        const newPhotos: Record<string, Photo> = {};
        for (let i = 0; i < fileList.length; i++) {
            try {
                const file = fileList[i];
                const { dataUrl, blob } = await resizeImage(file);
                const id = generateUniqueId();
                newIds.push(id);
                const label = file.name.replace(/\.[^/.]+$/, "");
                newPhotos[id] = { id, blob, dataUrl, label, timestamp: new Date(file.lastModified).toLocaleString('ja-JP') };
                const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
                showStatus(`${i + 1} / ${fileList.length} 枚の写真を読み込み中... ${elapsedSeconds}秒`, "info", 15000);
            } catch (err) { console.error("Image processing error", err); }
        }
        setPhotoLibrary(prev => ({ ...prev, ...newPhotos }));
        setPendingPhotoIds(prev => dedupeIds([...prev, ...newIds]));
        
        if (newIds.length > 0) {
            const firstId = newIds[0];
            _setSelectedPhotoId(firstId);
            setAppMode('draw');
            setCurrentMarkerType('photo');
            setActiveTab('inspection');
            const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
            showStatus(`${newIds.length}枚の写真を追加しました。配置を開始してください。(${elapsedSeconds}秒)`, "success");
        } else {
            showStatus("写真をライブラリに追加しました", "success");
        }
    }, [showStatus]);

    const setSelectedPhotoId = useCallback((id: string | null) => {
        _setSelectedPhotoId(id);
        if (id) {
            setAppMode('draw');
            setCurrentMarkerType('photo');
            setActiveTab('inspection');
        }
    }, []);

    const updatePhotoLabel = useCallback((id: string, label: string) => {
        setPhotoLibrary(prev => ({ ...prev, [id]: { ...prev[id], label } }));
    }, []);

    const addMarker = useCallback((marker: Marker) => {
        const nextMarker = { ...marker };
        const photoIdToUse = nextMarker.photoId || (nextMarker.type === 'photo' ? selectedPhotoId : undefined);
        
        if (nextMarker.type === 'photo' && photoIdToUse) {
            nextMarker.photoId = photoIdToUse;
            const remaining = dedupeIds(pendingPhotoIds.filter(id => id !== photoIdToUse));
            setPendingPhotoIds(remaining);
            if (remaining.length > 0) {
                const nextId = remaining[0];
                _setSelectedPhotoId(nextId);
                setAppMode('draw');
                setCurrentMarkerType('photo');
            } else {
                _setSelectedPhotoId(null);
            }
        }
        
        // 座標の境界チェック
        nextMarker.x = Math.max(-0.2, Math.min(1.2, nextMarker.x));
        nextMarker.y = Math.max(-0.2, Math.min(1.2, nextMarker.y));

        baseAddMarker(nextMarker);
        if (tutorialStep === 'place_access' && nextMarker.type === 'access_point') setTutorialStep('underfloor_photo');
        if (workflowStep === 'entry_setup' && nextMarker.type === 'access_point') {
            showStatus("侵入口を設定しました。床下モードの準備完了です。", "success");
        }
    }, [selectedPhotoId, baseAddMarker, workflowStep, tutorialStep, showStatus, pendingPhotoIds]);

    const removeMarker = useCallback((id: string) => {
        const marker = markers.find(m => m.id === id);
        if (marker?.type === 'photo' && marker.photoId) {
            setPendingPhotoIds(prev => dedupeIds([...prev, marker.photoId!]));
        }
        baseRemoveMarker(id);
    }, [markers, baseRemoveMarker]);

    const removeLastMarker = useCallback(() => {
        const last = markers[markers.length - 1];
        if (last?.type === 'photo' && last.photoId) {
            setPendingPhotoIds(prev => dedupeIds([...prev, last.photoId!]));
        }
        baseRemoveLastMarker();
    }, [markers, baseRemoveLastMarker]);

    const addCapturedPhoto = useCallback((photo: Photo) => {
        setPhotoLibrary(prev => ({ ...prev, [photo.id]: photo }));
        setCapturedPhotos(prev => [...prev, photo]);
        
        // 写真撮影時に自動的にマーカーを図面にプロットする
        if (cameraTapPosition) {
            addMarker({
                id: generateUniqueId(),
                type: 'photo',
                x: cameraTapPosition.x,
                y: cameraTapPosition.y,
                photoId: photo.id,
                rotation: cameraTapPosition.rotation,
                length: cameraTapPosition.length
            });
            showStatus(`点検箇所 ${capturedPhotos.length + 1} を記録しました`, "success");
        }

        setCameraTapPosition(null);

        if (tutorialStep === 'underfloor_photo') setTutorialStep('finish');
    }, [tutorialStep, cameraTapPosition, addMarker, capturedPhotos.length, showStatus]);

    const toggleFullscreen = useCallback(() => {
        const doc = document as Document & { webkitFullscreenElement?: Element, mozFullscreenElement?: Element, msFullscreenElement?: Element, webkitExitFullscreen?: () => Promise<void>, mozCancelFullScreen?: () => Promise<void>, msExitFullscreen?: () => Promise<void> };
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void>, mozRequestFullScreen?: () => Promise<void>, msRequestFullscreen?: () => Promise<void> };
        const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullscreenElement || doc.msFullscreenElement);
        if (!isFull) {
            const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (requestMethod) requestMethod.call(el).then(() => setIsFullscreen(true)).catch(() => showStatus("全画面表示に失敗しました", "error"));
        } else {
            const exitMethod = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
            if (exitMethod) { exitMethod.call(doc); setIsFullscreen(false); }
        }
    }, [showStatus]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as Document & { webkitFullscreenElement?: Element, mozFullscreenElement?: Element, msFullscreenElement?: Element };
            setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullscreenElement || doc.msFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const exportStateToJson = useCallback(() => {
        const data = {
            version: "1.7.0",
            timestamp: new Date().toISOString(),
            workflowStep,
            uiMode,
            floorPlanImage,
            floorPlanRotation,
            floorPlanWidth,
            floorPlanAspectRatio,
            isGridMode,
            gridSize,
            markers,
            photoLibrary,
            pendingPhotoIds,
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plan_data_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [workflowStep, uiMode, floorPlanImage, floorPlanRotation, floorPlanWidth, floorPlanAspectRatio, isGridMode, gridSize, markers, photoLibrary, pendingPhotoIds]);

    const importStateFromJson = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            resetEditor();

            const importedFloorPlan = sanitizeImportedPhoto(data.floorPlanImage);
            const { nextPhotoLibrary, skippedCount } = sanitizeImportedPhotoLibrary(data.photoLibrary);
            const nextMarkers = Array.isArray(data.markers) ? data.markers as Marker[] : [];
            const nextPendingPhotoIds = dedupeIds(
                (Array.isArray(data.pendingPhotoIds) ? data.pendingPhotoIds : []).filter((id: unknown): id is string => typeof id === 'string' && !!nextPhotoLibrary[id])
            );
            const importedPlacedPhotos = nextMarkers
                .filter((marker): marker is Marker & { photoId: string } => marker.type === 'photo' && typeof marker.photoId === 'string')
                .map(marker => nextPhotoLibrary[marker.photoId])
                .filter((photo): photo is Photo => !!photo);

            if (data.workflowStep) setWorkflowStep(data.workflowStep);
            if (data.uiMode === 'office' || data.uiMode === 'field') setUiMode(data.uiMode);
            setFloorPlanImage(importedFloorPlan);
            setFloorPlanRotation(typeof data.floorPlanRotation === 'number' ? data.floorPlanRotation : 0);
            const importedFloorPlanWidth = typeof data.floorPlanWidth === 'number' ? data.floorPlanWidth : 1000;
            setFloorPlanWidth(importedFloorPlanWidth);
            setFloorPlanAspectRatio(typeof data.floorPlanAspectRatio === 'number' ? data.floorPlanAspectRatio : null);
            setIsGridMode(Boolean(data.isGridMode));
            const importedGridSize = typeof data.gridSize === 'number'
                ? data.gridSize
                : (Boolean(data.isGridMode) ? importedFloorPlanWidth / GRID_CELL_COUNT : DEFAULT_GRID_SIZE);
            setGridSize(importedGridSize);
            setMarkers(nextMarkers);
            setPhotoLibrary(nextPhotoLibrary);
            setPendingPhotoIds(nextPendingPhotoIds);
            _setSelectedPhotoId(nextPendingPhotoIds[0] ?? null);
            setCapturedPhotos(importedPlacedPhotos);

            if (skippedCount > 0) {
                showStatus(`旧形式の画像 ${skippedCount} 件は復元できませんでした`, "error", 5000);
            } else {
                showStatus("データを読み込みました", "success");
            }
        } catch {
            showStatus("読み込みに失敗しました", "error");
        }
    }, [resetEditor, showStatus, setMarkers]);

    const state: EditorState = {
        workflowStep, tutorialStep, uiMode, isGridPanelOpen, isFullscreen, activeModal,
        appMode, activeTab, currentMarkerType, gridSize, currentLineThickness, currentLineColor,
        cameraTapPosition, activePhotoIndex, selectedMarkerId, isTrimming, isExporting, statusMessage,
        floorPlanImage, floorPlanRotation, floorPlanWidth, floorPlanAspectRatio, isGridMode, markers, capturedPhotos,
        photoLibrary, pendingPhotoIds, selectedPhotoId, narration
    };

    const setNarrationSettings = useCallback((settings: Partial<EditorState['narration']>) => {
        setNarration(prev => ({ ...prev, ...settings }));
    }, []);

    const actions: EditorActions = useMemo(() => ({
        setWorkflowStep, setTutorialStep, setUiMode, nextStep, setIsGridPanelOpen, toggleFullscreen, setActiveModal,
        setAppMode, setActiveTab, setCurrentMarkerType, setGridSize, setCurrentLineThickness, setCurrentLineColor,
        setCameraTapPosition, addCapturedPhoto, setActivePhotoIndex,
        setSelectedMarkerId, setIsTrimming, setIsExporting, showStatus,
        setFloorPlanImage, setFloorPlanRotation, setFloorPlanWidth, setFloorPlanAspectRatio, setIsGridMode,
        addMarker, updateMarker, removeMarker, removeLastMarker, clearMarkers, setMarkers,
        exportStateToJson, importStateFromJson, resetEditor,
        addPhotosToLibrary, setSelectedPhotoId, updatePhotoLabel, startTutorial, setNarrationSettings
    }), [
        nextStep, toggleFullscreen, showStatus, addMarker, updateMarker, removeMarker, 
        removeLastMarker, clearMarkers, setMarkers, exportStateToJson, importStateFromJson, 
        resetEditor, addPhotosToLibrary, setSelectedPhotoId, updatePhotoLabel, startTutorial, setNarrationSettings
    ]);

    return <EditorContext.Provider value={{ state, actions }}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditorContext must be used within EditorProvider");
    return context;
};
