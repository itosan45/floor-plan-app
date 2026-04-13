
import React, { useState, useRef, useMemo } from 'react';
import { 
    MARKER_DEFINITIONS, 
    MARKER_SORT_ORDER, 
    MarkerCategory 
} from '../constants';
import { MarkerType, Marker } from '../types';
import { EditorState, EditorActions } from '../hooks/useEditorState';
import { 
    Spinner,
    ClipboardIcon, HammerIcon, TagIcon, MicrophoneIcon, PhotoIcon, XMarkIcon,
    CameraIcon, BoltIcon, PencilIcon, TrashIcon, SparklesIcon, QuestionMarkCircleIcon, ChevronRightIcon
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

    const presetNames = useMemo(() => {
        return MARKER_SORT_ORDER
            .filter(type => MARKER_DEFINITIONS[type].category === 'name')
            .map(type => MARKER_DEFINITIONS[type].label);
    }, []);

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
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <PhotoIcon className="w-4 h-4"/>
                    写真を選択して追加
                </button>
                <input 
                    type="file" multiple accept="image/*" 
                    className="hidden" ref={fileInputRef}
                    onChange={(e) => e.target.files && addPhotosToLibrary(e.target.files)} 
                />
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 bg-gray-100/50">
                {pendingPhotoIds.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <PhotoIcon className="w-10 h-10 mx-auto opacity-20 mb-2" />
                        <p className="text-[10px] font-bold">未配置の写真はありません</p>
                    </div>
                ) : (
                    pendingPhotoIds.map(id => {
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
                                <div className="px-2 pb-1 text-right">
                                     <span className="text-[9px] text-gray-400 font-mono">{photo.timestamp}</span>
                                </div>
                            </div>
                        );
                    })
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
    const categoryLabels: Record<MarkerCategory, string> = { inspection: '点検', construction: '施工', name: '名称' };
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
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const { activeTab, currentMarkerType, currentLineColor, selectedMarkerId, isExporting, appMode, isGridMode, pendingPhotoIds, workflowStep } = state;
    const { setActiveTab, setCurrentMarkerType, setAppMode, setCurrentLineColor, showStatus, setActiveModal, setWorkflowStep } = actions;
    const { updateMarker } = markerActions;

    const WORKFLOW_STEPS: { key: any; label: string }[] = [
        { key: 'preparation', label: '1' },
        { key: 'floor_drafting', label: '2' },
        { key: 'entry_setup', label: '3' },
        { key: 'underfloor', label: '4' },
        { key: 'completion', label: '5' },
    ];

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
                    <div className="p-1.5 border-b border-gray-800 flex flex-col gap-3 py-4 items-center">
                        <button onClick={() => setActiveModal('report')} className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-600 text-white font-black text-xl shadow-lg active:scale-95 transition-all" title="レポートを表示">報</button>
                        
                        {/* 1-5 Step Selector (Replacing the Top Banner) */}
                        <div className="flex flex-col gap-1.5 py-2 border-y border-white/5 w-full items-center">
                            {WORKFLOW_STEPS.map((s, idx) => (
                                <button 
                                    key={s.key} 
                                    onClick={() => setWorkflowStep(s.key)}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${workflowStep === s.key ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <button 
                                onClick={() => { setIsLibraryOpen(!isLibraryOpen); setIsPaletteOpen(false); }}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${isLibraryOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                                title="写真ライブラリ"
                            >
                                <PhotoIcon className="w-6 h-6" />
                                {pendingPhotoIds.length > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                                        {pendingPhotoIds.length}
                                    </div>
                                )}
                            </button>
                            <button 
                                onClick={() => {
                                    const nextMode = isGridMode ? 'drafting-voice' : 'inspection-voice';
                                    setAppMode(appMode === nextMode ? 'pan' : nextMode);
                                }}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border ${appMode.includes('voice') ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                                title="音声入力モード"
                            >
                                {isGridMode ? <SparklesIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-4 gap-4 overflow-y-auto custom-scrollbar">
                        <CategoryButton id="inspection" icon={ClipboardIcon} active={activeTab === 'inspection' && isPaletteOpen} onClick={handleCategoryClick} />
                        <CategoryButton id="construction" icon={HammerIcon} active={activeTab === 'construction' && isPaletteOpen} onClick={handleCategoryClick} />
                        <CategoryButton id="name" icon={TagIcon} active={activeTab === 'name' && isPaletteOpen} onClick={handleCategoryClick} />
                    </div>
                    <div className="p-1.5 border-t border-gray-800 bg-gray-950 flex flex-col gap-2 pb-6 items-center relative">
                        {isExportMenuOpen && (
                            <div className="absolute bottom-full mb-4 left-14 w-48 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-2 animate-bounce-in">
                                <p className="text-[9px] font-black text-gray-500 uppercase px-3 py-1 mb-1 tracking-widest">保存形式を選択</p>
                                <button onClick={() => { setIsExportMenuOpen(false); performCropAndExport({ rawDiagram: false, format: 'jpg' }); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center justify-between">
                                    A4報告用 (.jpg) <ChevronRightIcon className="w-3 h-3 text-indigo-500" />
                                </button>
                                <button onClick={() => { setIsExportMenuOpen(false); performCropAndExport({ rawDiagram: true, format: 'jpg' }); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center justify-between">
                                    図面のみ (.jpg) <ChevronRightIcon className="w-3 h-3 text-indigo-500" />
                                </button>
                                <button onClick={() => { setIsExportMenuOpen(false); performCropAndExport({ rawDiagram: true, format: 'png' }); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center justify-between border-t border-white/5 mt-1">
                                    高画質図面 (.png) <ChevronRightIcon className="w-3 h-3 text-indigo-500" />
                                </button>
                            </div>
                        )}
                        <button 
                            onClick={() => setActiveModal('help')}
                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-800 text-gray-400 hover:text-white transition-all active:scale-95"
                            title="マニュアル"
                        >
                            <QuestionMarkCircleIcon className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setIsColorPickerOpen(true)} 
                            className="w-11 h-6 rounded-full border border-gray-700 shadow-md hover:scale-105 transition-all mb-2" 
                            style={{ backgroundColor: currentLineColor }} 
                        />
                        <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} disabled={isExporting} className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-lg active:scale-95 transition-all" title="エクスポート形式を選択">
                            {isExporting ? <Spinner /> : <BoltIcon className="w-6 h-6" />}
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
    icon: React.FC<{ className?: string }>;
    active: boolean;
    onClick: (id: MarkerCategory) => void;
}> = ({ id, icon: Icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border relative ${active ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-indigo-400'}`}
    >
        <Icon className="w-6 h-6" />
    </button>
);
