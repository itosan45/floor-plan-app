
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Marker, MarkerType, Photo, WorkflowStep, TutorialStep } from '../types';
import { MarkerCategory } from '../constants';
import { useMarkers } from '../hooks/useMarkers';
import { generateUniqueId } from '../utils/common';
import { resizeImage } from '../utils/imageProcessing';

export type AppMode = 'pan' | 'draw' | 'inspection-voice' | 'inspection-manual' | 'drafting-voice';
export type ActiveModal = 'none' | 'help' | 'report' | 'camera' | 'photo-viewer' | 'voice-drafting' | 'confirm-transition';
export type UiMode = 'office' | 'field';

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
    photoMarkerScale: number;
    cameraTapPosition: { x: number; y: number } | null;
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
    pendingRoom: { label: string, gridW: number, gridH: number } | null;
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
    setPhotoMarkerScale: (scale: number) => void;
    setCameraTapPosition: (pos: { x: number; y: number } | null) => void;
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
    setPendingRoom: (room: { label: string, gridW: number, gridH: number } | null) => void;
    addPhotosToLibrary: (files: FileList) => Promise<void>;
    setSelectedPhotoId: (id: string | null) => void;
    updatePhotoLabel: (id: string, label: string) => void;
    startTutorial: () => void;
}

const EditorContext = createContext<{ state: EditorState; actions: EditorActions } | null>(null);

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
    const [gridSize, setGridSize] = useState<number>(40);
    const [currentLineThickness, setCurrentLineThickness] = useState<number>(5);
    const [currentLineColor, setCurrentLineColor] = useState<string>('#0044cc');
    const [photoMarkerScale, setPhotoMarkerScale] = useState<number>(1.0);
    const [cameraTapPosition, setCameraTapPosition] = useState<{ x: number; y: number } | null>(null);
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
    const [pendingRoom, setPendingRoom] = useState<{ label: string, gridW: number, gridH: number } | null>(null);
    const [photoLibrary, setPhotoLibrary] = useState<Record<string, Photo>>({});
    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
    const [selectedPhotoId, _setSelectedPhotoId] = useState<string | null>(null);
    
    const { markers, addMarker: baseAddMarker, updateMarker, removeMarker: baseRemoveMarker, removeLastMarker: baseRemoveLastMarker, clearMarkers, setMarkers } = useMarkers();

    const showStatus = useCallback((text: string, type: 'success' | 'error' | 'info', duration = 3000) => {
        setStatusMessage({ text, type });
        setTimeout(() => setStatusMessage(null), duration);
    }, []);

    const resetEditor = useCallback(() => {
        setWorkflowStep('preparation');
        setTutorialStep('none');
        setFloorPlanImage(null);
        setFloorPlanRotation(0);
        setIsGridMode(false);
        clearMarkers();
        setPhotoLibrary({});
        setPendingPhotoIds([]);
        setAppMode('pan');
        setActiveModal('none');
    }, [clearMarkers]);

    const startTutorial = useCallback(() => {
        resetEditor();
        setUiMode('field');
        setIsGridMode(true);
        setFloorPlanWidth(1200);
        setFloorPlanAspectRatio(1);
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

    const addPhotosToLibrary = useCallback(async (files: FileList) => {
        showStatus(`${files.length}枚の写真を読み込み中...`, "info");
        const newIds: string[] = [];
        const newPhotos: Record<string, Photo> = {};
        for (let i = 0; i < files.length; i++) {
            try {
                const file = files[i];
                const { dataUrl, blob } = await resizeImage(file);
                const id = generateUniqueId();
                newIds.push(id);
                const label = file.name.replace(/\.[^/.]+$/, "");
                newPhotos[id] = { id, blob, dataUrl, label, timestamp: new Date(file.lastModified).toLocaleString('ja-JP') };
            } catch (err) { console.error("Image processing error", err); }
        }
        setPhotoLibrary(prev => ({ ...prev, ...newPhotos }));
        setPendingPhotoIds(prev => [...prev, ...newIds]);
        
        if (newIds.length > 0) {
            const firstId = newIds[0];
            _setSelectedPhotoId(firstId);
            setAppMode('draw');
            setCurrentMarkerType('photo');
            setActiveTab('inspection');
            showStatus("写真を追加しました。配置を開始してください。", "success");
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
        if (marker.type === 'photo' && selectedPhotoId) {
            marker.photoId = selectedPhotoId;
            const remaining = pendingPhotoIds.filter(id => id !== selectedPhotoId);
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
        marker.x = Math.max(-0.2, Math.min(1.2, marker.x));
        marker.y = Math.max(-0.2, Math.min(1.2, marker.y));

        baseAddMarker(marker);
        if (tutorialStep === 'place_room' && marker.type === 'room') setTutorialStep('place_access');
        if (tutorialStep === 'place_access' && marker.type === 'access_point') setTutorialStep('underfloor_photo');
        if (workflowStep === 'entry_setup' && marker.type === 'access_point') {
            showStatus("侵入口を設定しました。床下モードの準備完了です。", "success");
        }
    }, [selectedPhotoId, baseAddMarker, workflowStep, tutorialStep, showStatus, pendingPhotoIds]);

    const removeMarker = useCallback((id: string) => {
        const marker = markers.find(m => m.id === id);
        if (marker?.type === 'photo' && marker.photoId) setPendingPhotoIds(prev => [...prev, marker.photoId!]);
        baseRemoveMarker(id);
    }, [markers, baseRemoveMarker]);

    const removeLastMarker = useCallback(() => {
        const last = markers[markers.length - 1];
        if (last?.type === 'photo' && last.photoId) setPendingPhotoIds(prev => [...prev, last.photoId!]);
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
                rotation: 0,
                length: 1.0
            });
            showStatus(`点検箇所 ${capturedPhotos.length + 1} を記録しました`, "success");
        }

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
        const data = { version: "1.2.0", workflowStep, timestamp: new Date().toISOString(), floorPlanImage, floorPlanRotation, floorPlanWidth, floorPlanAspectRatio, isGridMode, gridSize, markers, photoLibrary, pendingPhotoIds };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plan_data_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [workflowStep, floorPlanImage, floorPlanRotation, floorPlanWidth, floorPlanAspectRatio, isGridMode, gridSize, markers, photoLibrary, pendingPhotoIds]);

    const importStateFromJson = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // 簡易バリデーション
            if (!data.markers || !Array.isArray(data.markers)) {
                throw new Error("Invalid data format: markers missing or not an array");
            }

            if (data.workflowStep) setWorkflowStep(data.workflowStep);
            setFloorPlanImage(data.floorPlanImage);
            setFloorPlanRotation(data.floorPlanRotation || 0);
            setFloorPlanWidth(data.floorPlanWidth || 1000);
            setMarkers(data.markers);
            setPhotoLibrary(data.photoLibrary || {});
            setPendingPhotoIds(data.pendingPhotoIds || []);
            showStatus("データを読み込みました", "success");
        } catch (e) { 
            console.error("Import error", e);
            showStatus(e instanceof Error ? e.message : "読み込みに失敗しました", "error"); 
        }
    }, [showStatus, setMarkers]);

    const state: EditorState = {
        workflowStep, tutorialStep, uiMode, isGridPanelOpen, isFullscreen, activeModal,
        appMode, activeTab, currentMarkerType, gridSize, currentLineThickness, currentLineColor,
        photoMarkerScale,
        cameraTapPosition, activePhotoIndex, selectedMarkerId, isTrimming, isExporting, statusMessage,
        floorPlanImage, floorPlanRotation, floorPlanWidth, floorPlanAspectRatio, isGridMode, markers, capturedPhotos,
        photoLibrary, pendingPhotoIds, selectedPhotoId, pendingRoom
    };

    const actions: EditorActions = useMemo(() => ({
        setWorkflowStep, setTutorialStep, setUiMode, nextStep, setIsGridPanelOpen, toggleFullscreen, setActiveModal,
        setAppMode, setActiveTab, setCurrentMarkerType, setGridSize, setCurrentLineThickness, setCurrentLineColor,
        setPhotoMarkerScale,
        setCameraTapPosition, addCapturedPhoto, setActivePhotoIndex,
        setSelectedMarkerId, setIsTrimming, setIsExporting, showStatus,
        setFloorPlanImage, setFloorPlanRotation, setFloorPlanWidth, setFloorPlanAspectRatio, setIsGridMode,
        addMarker, updateMarker, removeMarker, removeLastMarker, clearMarkers, setMarkers,
        exportStateToJson, importStateFromJson, resetEditor, setPendingRoom,
        addPhotosToLibrary, setSelectedPhotoId, updatePhotoLabel, startTutorial
    }), [
        nextStep, toggleFullscreen, showStatus, addMarker, updateMarker, removeMarker, 
        removeLastMarker, clearMarkers, setMarkers, exportStateToJson, importStateFromJson, 
        resetEditor, addPhotosToLibrary, setSelectedPhotoId, updatePhotoLabel, startTutorial
    ]);

    return <EditorContext.Provider value={{ state, actions }}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditorContext must be used within EditorProvider");
    return context;
};
