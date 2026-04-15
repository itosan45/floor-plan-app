
import React, { useState, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { 
    MARKER_DEFINITIONS, 
    MARKER_SORT_ORDER, 
    MarkerCategory 
} from '../constants';
import { MarkerType, Marker } from '../types';
import { EditorState, EditorActions } from '../hooks/useEditorState';
import { 
    Spinner,
    PhotoIcon, XMarkIcon,
    BoltIcon, DownloadIcon
} from './icons';
import { MarkerDisplay } from './Marker';

interface SidebarProps {
    state: EditorState;
    actions: EditorActions;
    markerActions: {
        removeMarker: (id: string) => void;
        updateMarker: (id: string, updates: Partial<Marker>) => void;
    };
    performCropAndExport: () => void;
}

const COLORS = [
    { name: '黒', color: '#000000' },
    { name: '青', color: '#0044cc' }, // Middle-ground blue
    { name: '赤', color: '#ef4444' },
    { name: '緑', color: '#22c55e' },
    { name: '黄', color: '#eab308' },
];

const ColorPickerOverlay: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentColor: string;
    onSelect: (color: string) => void;
}> = ({ isOpen, onClose, currentColor, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center" onPointerDown={onClose}>
            <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-bounce-in" onPointerDown={e => e.stopPropagation()}>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">カラーを選択</h4>
                <div className="flex gap-4">
                    {COLORS.map((c) => (
                        <button key={c.color} onClick={() => onSelect(c.color)} className={`w-12 h-12 rounded-full border-4 transition-all active:scale-90 ${currentColor === c.color ? 'border-indigo-500 shadow-lg' : 'border-gray-100'}`} style={{ backgroundColor: c.color }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const PhotoLibraryPanel: React.FC<{
    state: EditorState;
    actions: EditorActions;
}> = ({ state, actions }) => {
    const { photoLibrary, pendingPhotoIds, selectedPhotoId } = state;
    const { addPhotosToLibrary, setSelectedPhotoId, updatePhotoLabel } = actions;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isNativePlatform = Capacitor.isNativePlatform();

    const presetNames = useMemo(() => {
        return MARKER_SORT_ORDER
            .filter(type => MARKER_DEFINITIONS[type].category === 'name')
            .map(type => MARKER_DEFINITIONS[type].label);
    }, []);
    const pendingPhotoSet = useMemo(() => new Set(pendingPhotoIds), [pendingPhotoIds]);
    const placedPhotoIds = useMemo(() => {
        return Object.keys(photoLibrary).filter(id => !pendingPhotoSet.has(id));
    }, [photoLibrary, pendingPhotoSet]);

    const renderPhotoCard = (id: string, isPending: boolean) => {
        const photo = photoLibrary[id];
        if (!photo) return null;
        const isSelected = selectedPhotoId === id;
        return (
            <div 
                key={id}
                onClick={() => setSelectedPhotoId(isSelected ? null : id)}
                className={`group relative bg-white rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <div className="flex p-2 gap-3">
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative border border-gray-100">
                        <img src={photo.dataUrl} className="w-full h-full object-cover" alt={photo.label} />
                        {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                <div className="bg-indigo-600 text-white p-1 rounded-full"><BoltIcon className="w-4 h-4 animate-pulse" /></div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="relative">
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">ラベル名 (報告書・ファイル名)</label>
                            <input 
                                type="text"
                                className="w-full bg-gray-50 text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1.5 border border-gray-200"
                                value={photo.label}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updatePhotoLabel(id, e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">プリセット名称</label>
                            <select
                                className="w-full text-[10px] font-bold bg-white border border-gray-300 rounded px-1.5 py-1 text-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                onClick={e => e.stopPropagation()}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        updatePhotoLabel(id, e.target.value);
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>名前を選択してリネーム...</option>
                                {presetNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="px-2 pb-2 flex items-center justify-between">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isPending ? '未配置' : '配置済み'}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">{photo.timestamp}</span>
                </div>
            </div>
        );
    };

    const handleAddPhotos = async () => {
        if (!isNativePlatform) {
            fileInputRef.current?.click();
            return;
        }

        try {
            const result = await Camera.pickImages({
                quality: 80,
                limit: 0,
            });

            const files = await Promise.all(
                result.photos.map(async (photo, index) => {
                    const sourceUrl = photo.webPath ?? photo.path;
                    if (!sourceUrl) {
                        throw new Error('選択した画像の読み込み元が取得できませんでした');
                    }

                    const response = await fetch(sourceUrl);
                    const blob = await response.blob();
                    const extension = blob.type.includes('png') ? 'png' : 'jpg';
                    const fileName = photo.webPath?.split('/').pop() ?? `gallery-photo-${Date.now()}-${index + 1}.${extension}`;
                    return new File([blob], fileName, {
                        type: blob.type || 'image/jpeg',
                        lastModified: Date.now(),
                    });
                })
            );

            if (files.length > 0) {
                await addPhotosToLibrary(files);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (!/cancel/i.test(message)) {
                console.error('Native gallery import error:', error);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-white animate-fade-in border-r border-gray-200 w-72 shadow-xl">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-black text-sm text-gray-800 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5 text-indigo-600" />
                    写真ライブラリ
                </h3>
                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingPhotoIds.length}
                </span>
            </div>

            <div className="p-3 border-b">
                <button 
                    onClick={() => { void handleAddPhotos(); }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <PhotoIcon className="w-4 h-4"/>
                    {isNativePlatform ? '端末写真を複数追加' : '写真を選択して追加'}
                </button>
                <input 
                    type="file" multiple accept="image/*" 
                    className="hidden" ref={fileInputRef}
                    onChange={(e) => {
                        if (e.target.files) addPhotosToLibrary(e.target.files);
                        e.target.value = '';
                    }} 
                />
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 bg-gray-100/50">
                {Object.keys(photoLibrary).length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <PhotoIcon className="w-10 h-10 mx-auto opacity-20 mb-2" />
                        <p className="text-[10px] font-bold">写真はまだありません</p>
                    </div>
                ) : (
                    <>
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">未配置</h4>
                                <span className="text-[10px] font-black text-amber-600">{pendingPhotoIds.length}</span>
                            </div>
                            <div className="space-y-4">
                                {pendingPhotoIds.length > 0 ? pendingPhotoIds.map(id => renderPhotoCard(id, true)) : (
                                    <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 py-4 text-center text-[10px] font-bold text-gray-400">
                                        未配置の写真はありません
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 mt-5 flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">配置済み</h4>
                                <span className="text-[10px] font-black text-emerald-600">{placedPhotoIds.length}</span>
                            </div>
                            <div className="space-y-4">
                                {placedPhotoIds.length > 0 ? placedPhotoIds.map(id => renderPhotoCard(id, false)) : (
                                    <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 py-4 text-center text-[10px] font-bold text-gray-400">
                                        まだ配置済み写真はありません
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const MarkerPaletteOverlay: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activeTab: MarkerCategory;
    currentMarkerType: MarkerType;
    onSelectMarker: (type: MarkerType) => void;
}> = ({ isOpen, onClose, activeTab, currentMarkerType, onSelectMarker }) => {
    if (!isOpen) return null;
    const categoryLabels: Record<MarkerCategory, string> = { inspection: '点検', construction: '構造', name: '名称' };
    return (
        <div className="fixed inset-0 z-[100]" onPointerDown={onClose}>
            <div className="absolute left-16 top-4 bottom-4 w-64 bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col animate-bounce-in overflow-hidden" onPointerDown={e => e.stopPropagation()}>
                <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">{categoryLabels[activeTab]}</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar grid grid-cols-1 gap-1">
                    {MARKER_SORT_ORDER.filter(t => MARKER_DEFINITIONS[t].category === activeTab).map(type => (
                        <button
                            key={type}
                            onClick={() => onSelectMarker(type)}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-all active:scale-95 text-left border ${currentMarkerType === type ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'}`}
                        >
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded border border-gray-100">
                                <MarkerDisplay marker={{ type, id: 'icon', x: 0, y: 0 }} containerWidth={30} previewSize={26} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700 truncate">{MARKER_DEFINITIONS[type].label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ state, actions, markerActions, performCropAndExport }) => {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const { activeTab, currentMarkerType, currentLineColor, selectedMarkerId, isExporting, appMode, pendingPhotoIds, markers, photoLibrary } = state;
    const { setActiveTab, setCurrentMarkerType, setAppMode, setCurrentLineColor, showStatus, setActiveModal, exportStateToJson } = actions;
    const { updateMarker } = markerActions;
    const placedPhotoCount = markers.filter(marker => marker.type === 'photo' && !!marker.photoId && !!photoLibrary[marker.photoId]).length;

    const handleCategoryClick = (catId: MarkerCategory) => {
        setIsLibraryOpen(false);
        setActiveTab(catId);
        setIsPaletteOpen(true);
    };

    const handleSelectMarker = (type: MarkerType) => {
        setCurrentMarkerType(type);
        setAppMode('draw');
        setIsPaletteOpen(false);
        showStatus(`${MARKER_DEFINITIONS[type].label}を選択`, 'info', 1000);
    };

    const handleSelectColor = (color: string) => {
        setCurrentLineColor(color);
        if (selectedMarkerId) updateMarker(selectedMarkerId, { color });
        setIsColorPickerOpen(false);
    };

    return (
        <>
            <div className="flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col z-50 w-14">
                <div className="w-14 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 flex flex-col items-center py-4 gap-4 overflow-y-auto custom-scrollbar">
                        <button onClick={() => setActiveModal('report')} className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-600 text-white font-black text-xl shadow-lg active:scale-95 transition-all" title="レポートを表示">報</button>
                        <button
                            onClick={() => {
                                if (placedPhotoCount === 0) {
                                    showStatus('表示できる配置済み写真がありません', 'error');
                                    return;
                                }
                                setActiveModal('photo-viewer');
                            }}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${placedPhotoCount > 0 ? 'bg-gray-900 border-gray-700 text-indigo-300 hover:border-indigo-500' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
                            title="配置済み写真を確認"
                        >
                            <PhotoIcon className="w-5 h-5" />
                            {placedPhotoCount > 0 && (
                                <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {placedPhotoCount}
                                </div>
                            )}
                        </button>
                        <CategoryButton id="construction" label="構造" active={activeTab === 'construction' && isPaletteOpen} onClick={handleCategoryClick} />
                        
                        <button 
                            onClick={() => { setIsLibraryOpen(!isLibraryOpen); setIsPaletteOpen(false); }}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${isLibraryOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                            title="写真ライブラリ"
                        >
                            <span className="text-xs font-bold">写真</span>
                            {pendingPhotoIds.length > 0 && (
                                <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                                    {pendingPhotoIds.length}
                                </div>
                            )}
                        </button>

                        <CategoryButton id="inspection" label="点検" active={activeTab === 'inspection' && isPaletteOpen} onClick={handleCategoryClick} />

                        <button 
                            onClick={() => {
                                const nextMode = 'inspection-voice';
                                setAppMode(appMode === nextMode ? 'pan' : nextMode);
                            }}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border ${appMode.includes('voice') ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                            title="音声入力モード"
                        >
                            <span className="text-xs font-bold">音声</span>
                        </button>

                        <CategoryButton id="name" label="ラベル" active={activeTab === 'name' && isPaletteOpen} onClick={handleCategoryClick} />
                    </div>
                    <div className="p-1.5 border-t border-gray-800 bg-gray-950 flex flex-col gap-2 pb-6 items-center">
                        <button 
                            onClick={() => setIsColorPickerOpen(true)} 
                            className="w-11 h-6 rounded-full border border-gray-700 shadow-md hover:scale-105 transition-all mb-2" 
                            style={{ backgroundColor: currentLineColor }} 
                        />
                        <button onClick={performCropAndExport} disabled={isExporting} className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-lg active:scale-95 transition-all" title="保存">
                            {isExporting ? <Spinner /> : <BoltIcon className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={exportStateToJson}
                            className="w-11 h-11 bg-gray-900 border border-gray-800 text-indigo-300 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                            title="JSONバックアップを書き出し"
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            {isLibraryOpen && <PhotoLibraryPanel state={state} actions={actions} />}
            <MarkerPaletteOverlay isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} activeTab={activeTab} currentMarkerType={currentMarkerType} onSelectMarker={handleSelectMarker} />
            <ColorPickerOverlay isOpen={isColorPickerOpen} onClose={() => setIsColorPickerOpen(false)} currentColor={currentLineColor} onSelect={handleSelectColor} />
        </>
    );
};

const CategoryButton: React.FC<{
    id: MarkerCategory;
    label: string;
    active: boolean;
    onClick: (id: MarkerCategory) => void;
}> = ({ id, label, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${active ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-indigo-400'}`}
    >
        <span className="text-xs font-bold">{label}</span>
    </button>
);
