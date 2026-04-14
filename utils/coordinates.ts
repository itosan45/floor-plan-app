
/**
 * 画面上のクライアント座標(clientX, clientY)を、指定した要素内の相対座標(0-1)に変換する
 */
export const getCanvasCoordinates = (
    clientX: number, 
    clientY: number, 
    element: HTMLElement | null
): { x: number; y: number } => {
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    
    // 回転やスケールが適用されている場合でも、getBoundingClientRectは画面上の絶対位置を返すため
    // 単純な比率計算で相対位置(0-1)が得られる
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x, y };
};

/**
 * 相対座標(0-1)をピクセル座標に変換する
 */
export const relativeToPixel = (rel: number, totalPixel: number): number => rel * totalPixel;

/**
 * ピクセル座標を相対座標(0-1)に変換する
 */
export const pixelToRelative = (px: number, totalPixel: number): number => px / totalPixel;

/**
 * グリッドへの吸着計算
 */
export const snapToGrid = (
    val: number, 
    totalPixel: number, 
    gridSize: number, 
    subdivisions = 1
): number => {
    // gridSize（ピクセル）ベースで相対座標ステップを計算
    const size = (gridSize && gridSize > 0) ? gridSize : 20; // fallback
    
    // 相対座標(0-1)におけるステップ幅を計算
    const step = (size / totalPixel) / subdivisions;
        
    if (step === 0) return val;
    return Math.round(val / step) * step;
};

/**
 * 配置済みマーカーの境界ボックスを計算（エクスポート用）
 */
export const calculateAutoTrimRect = (containerElement: HTMLElement): { x: number; y: number; w: number; h: number } | null => {
    const containerRect = containerElement.getBoundingClientRect();
    const markers = containerElement.querySelectorAll('.group');
    
    if (markers.length === 0) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    markers.forEach(markerEl => {
        const rect = markerEl.getBoundingClientRect();
        const relX = (rect.left - containerRect.left) / containerRect.width;
        const relY = (rect.top - containerRect.top) / containerRect.height;
        const relW = rect.width / containerRect.width;
        const relH = rect.height / containerRect.height;

        minX = Math.min(minX, relX);
        minY = Math.min(minY, relY);
        maxX = Math.max(maxX, relX + relW);
        maxY = Math.max(maxY, relY + relH);
    });

    const padding = 0.05;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(1, maxX + padding);
    maxY = Math.min(1, maxY + padding);

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
};
