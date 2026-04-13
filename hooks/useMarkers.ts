
import { useState, useCallback } from 'react';
import type { Marker } from '../types';

export const useMarkers = () => {
    const [markers, setMarkers] = useState<Marker[]>([]);

    /**
     * 写真マーカーの番号をリストの並び順（追加順）に従って 1 から順に振り直す
     * これにより、途中の番号を消しても自動的に詰められ、常に連番が維持される
     */
    const renumberPhotos = (currentMarkers: Marker[]) => {
        let counter = 1;
        return currentMarkers.map(m => {
            if (m.type === 'photo') {
                return { ...m, number: counter++ };
            }
            return m;
        });
    };

    const addMarker = useCallback((marker: Marker) => {
        setMarkers(prev => {
            const next = [...prev, marker];
            return renumberPhotos(next);
        });
    }, []);

    const updateMarker = useCallback((id: string, updates: Partial<Marker>) => {
        setMarkers(prev => {
            const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
            // 座標更新などで順番が変わる可能性はないが、一貫性のために適用
            return renumberPhotos(next);
        });
    }, []);

    const removeMarker = useCallback((id: string) => {
        setMarkers(prev => {
            const next = prev.filter(m => m.id !== id);
            return renumberPhotos(next);
        });
    }, []);

    const removeLastMarker = useCallback(() => {
        setMarkers(prev => {
            if (prev.length === 0) return prev;
            const next = prev.slice(0, -1);
            return renumberPhotos(next);
        });
    }, []);

    const clearMarkers = useCallback(() => {
        setMarkers([]);
    }, []);

    const setMarkersWithRenumber = useCallback((newMarkers: Marker[]) => {
        setMarkers(renumberPhotos(newMarkers));
    }, []);

    return {
        markers,
        addMarker,
        updateMarker,
        removeMarker,
        removeLastMarker,
        clearMarkers,
        setMarkers: setMarkersWithRenumber
    };
};
