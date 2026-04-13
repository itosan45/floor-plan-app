import html2canvas from 'html2canvas';

export const loadHtml2Canvas = (): Promise<void> => {
    return Promise.resolve();
};

/**
 * 画像ファイルをリサイズ・圧縮してメモリ負荷を軽減する
 */
export const resizeImage = (file: File): Promise<{ dataUrl: string, blob: Blob }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const canvas = document.createElement('canvas');
      const maxSize = 1280; 
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low'; 
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Blob conversion failed'));
        const blobUrl = URL.createObjectURL(blob);
        canvas.width = 0;
        canvas.height = 0;
        img.src = "";
        resolve({ dataUrl: blobUrl, blob });
      }, 'image/jpeg', 0.5); 
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    
    img.src = objectUrl;
  });
};

/**
 * html2canvasでキャプチャし、Blobとして保存する
 */
export const captureAndGenerateA4 = async (
    element: HTMLElement,
    cropRect: { x: number; y: number; w: number; h: number }
): Promise<void> => {
    const captureWidth = element.scrollWidth;
    const captureHeight = element.scrollHeight;
    
    const cropX = Math.round(cropRect.x * captureWidth);
    const cropY = Math.round(cropRect.y * captureHeight);
    const cropWidth = Math.round(cropRect.w * captureWidth);
    const cropHeight = Math.round(cropRect.h * captureHeight);

    // スケールを2.0に設定し、レンダリング精度を確保
    // html2canvasのリサイズ中にクラッシュ・フリーズするのを防ぐため、タイムアウトを設ける
    let sourceCanvas: HTMLCanvasElement;
    try {
        const capturePromise = html2canvas(element, {
            scale: 2.0, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            x: cropX,
            y: cropY,
            width: cropWidth,
            height: cropHeight,
            windowWidth: captureWidth, 
            windowHeight: captureHeight
        });

        // 30秒のタイムアウトを設定
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Capture timed out')), 30000)
        );

        sourceCanvas = await Promise.race([capturePromise, timeoutPromise]);
    } catch (err) {
        console.error("html2canvas capture failed", err);
        throw err;
    }

    // A4モードか図面のみモードかを判定
    const isA4Mode = !options?.rawDiagram;
    const extension = options?.format === 'png' ? 'png' : 'jpg';
    const mimeType = options?.format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = options?.quality || 0.8;

    if (isA4Mode) {
        const a4Width = 3508;
        const a4Height = 2480;
        const destinationCanvas = document.createElement('canvas');
        destinationCanvas.width = a4Width;
        destinationCanvas.height = a4Height;
        const ctx = destinationCanvas.getContext('2d');
        
        if (!ctx) throw new Error('Could not get context');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, a4Width, a4Height);
        
        const sourceRatio = sourceCanvas.width / sourceCanvas.height;
        const targetRatio = a4Width / a4Height;
        
        let drawWidth, drawHeight;
        if (sourceRatio > targetRatio) {
            drawWidth = a4Width;
            drawHeight = a4Width / sourceRatio;
        } else {
            drawHeight = a4Height;
            drawWidth = a4Height * sourceRatio;
        }
        
        const drawX = (a4Width - drawWidth) / 2;
        const drawY = (a4Height - drawHeight) / 2;
        
        ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, drawX, drawY, drawWidth, drawHeight);

        destinationCanvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `floor_plan_A4_${Date.now()}.${extension}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            sourceCanvas.width = 0;
            sourceCanvas.height = 0;
            destinationCanvas.width = 0;
            destinationCanvas.height = 0;
        }, mimeType, quality);
    } else {
        // 図面のみモード
        sourceCanvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `floor_plan_diagram_${Date.now()}.${extension}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            sourceCanvas.width = 0;
            sourceCanvas.height = 0;
        }, mimeType, quality);
    }
};

export type ExportOptions = {
    rawDiagram?: boolean;
    format?: 'jpg' | 'png';
    quality?: number;
};

