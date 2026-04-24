/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { kMeans, traceContours, generateSVGPath, Color, Point, filterContours } from './utils/imageProcessing';
import { cn } from './lib/utils';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [processing, setProcessing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [layers, setLayers] = useState<{ id: number; svg: string; color: Color; name: string }[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]); // Indices of colors from top to bottom
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setLayers([]);
        setColors([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!image) return;
    setGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const parts: any[] = [];
      
      const mimeTypeMatch = image.match(/^data:(.*?);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
      const base64Data = image.split(',')[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
      
      const hardcodedStyle = `Style: High-contrast graphic illustration, classic Andy Warhol Pop Art style strictly optimized for physical laser cutting. Fixed Palette (Strict Compliance): Use ONLY these exactly 5 flat colors: Black (#090505), Blue (#0F4DAC), Red (#EE0E20), Yellow (#F7DA04), and Beige (#F1E8C3). Beige is the primary base layer. Technique: Flat solid color fills, absolutely NO gradients, NO shading, NO fur texture, no photorealism, no blending. Bold and extremely thick black contours with smooth, vector-like hard edges. Color Mapping & Laser Cutting Constraints (CRITICAL): Simplify features into MASSIVE, chunky, continuous geometric bold solid color blocks. ABSOLUTELY NO tiny details, NO small shapes, NO thin lines, NO speckles, and NO noise. All color fills MUST be huge, sweeping areas because tiny pieces will ruin the physical laser cutting process. Erase and merge any small details into the large adjacent blocks. The Red, Blue, and Yellow must be used as massive primary filling colors. Composition: Extreme close-up portrait, strictly HEAD ONLY, ABSOLUTELY NO NECK OR SHOULDERS VISIBLE! The subject's face MUST completely fill the frame. The ears MUST touch the very top edge, and the chin MUST touch the very bottom edge. Background: vertically split into massive Yellow on the left and Blue on the right. Output: incredibly clean, highly simplified, closed massive vector paths only.`;

      const enhancedPrompt = `TASK: Isolate the main subject's face from the attached uploaded photo and completely convert it into the strict graphic pop art style defined below. Maintain the identity of the original subject, but completely overwrite the artistic execution according to these rules:\n\nMANDATORY STYLE REQUIREMENTS:\n${hardcodedStyle}`;
      
      parts.push({ text: enhancedPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });
  
      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (imageUrl) {
        // Automatically color-snap the AI's raw output to the strictly defined 5-color palette immediately.
        // This ensures what the user sees in step 1 exactly matches the processed result in step 2.
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve) => (img.onload = resolve));
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const pixels = imageData.data;
          
          const extractedColors: Color[] = [
            { r: 9, g: 5, b: 5, id: 0 },
            { r: 15, g: 77, b: 172, id: 1 },
            { r: 238, g: 14, b: 32, id: 2 },
            { r: 247, g: 218, b: 4, id: 3 },
            { r: 241, g: 232, b: 195, id: 4 },
          ];
          
          for (let i = 0; i < pixels.length; i += 4) {
            let minDist = Infinity;
            let bestIdx = 0;
            for (let j = 0; j < extractedColors.length; j++) {
              const dist = Math.sqrt(
                Math.pow(pixels[i] - extractedColors[j].r, 2) +
                Math.pow(pixels[i + 1] - extractedColors[j].g, 2) +
                Math.pow(pixels[i + 2] - extractedColors[j].b, 2)
              );
              if (dist < minDist) {
                minDist = dist;
                bestIdx = j;
              }
            }
            pixels[i] = extractedColors[bestIdx].r;
            pixels[i+1] = extractedColors[bestIdx].g;
            pixels[i+2] = extractedColors[bestIdx].b;
            pixels[i+3] = 255;
          }
          tempCtx.putImageData(imageData, 0, 0);
          setImage(tempCanvas.toDataURL('image/png'));
        } else {
          setImage(imageUrl);
        }

        setLayers([]);
        setColors([]);
      } else {
        alert("Failed to generate image. No image data found in response.");
      }
    } catch(error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const processImage = async () => {
    if (!image || !canvasRef.current) return;
    setProcessing(true);

    const img = new Image();
    img.src = image;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Resize for processing performance
    const maxDim = 400;
    let w = img.width;
    let h = img.height;
    if (w > h) {
      if (w > maxDim) {
        h = (h * maxDim) / w;
        w = maxDim;
      }
    } else {
      if (h > maxDim) {
        w = (w * maxDim) / h;
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // 1. Hardcode 5 dominant colors as requested
    const extractedColors: Color[] = [
      { r: 9, g: 5, b: 5, id: 0 },
      { r: 15, g: 77, b: 172, id: 1 },
      { r: 238, g: 14, b: 32, id: 2 },
      { r: 247, g: 218, b: 4, id: 3 },
      { r: 241, g: 232, b: 195, id: 4 },
    ];
    
    // 2. Map each pixel to nearest color to calculate area (pixel count) & visually update canvas
    const colorCounts = new Array(extractedColors.length).fill(0);
    for (let i = 0; i < pixels.length; i += 4) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < extractedColors.length; j++) {
        const dist = Math.sqrt(
          Math.pow(pixels[i] - extractedColors[j].r, 2) +
          Math.pow(pixels[i + 1] - extractedColors[j].g, 2) +
          Math.pow(pixels[i + 2] - extractedColors[j].b, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      colorCounts[bestIdx]++;
      
      // OPTIONAL BUT HELPFUL: Actually rewrite the pixels to the canvas so the user sees the 5-color mapped preview
      pixels[i] = extractedColors[bestIdx].r;
      pixels[i+1] = extractedColors[bestIdx].g;
      pixels[i+2] = extractedColors[bestIdx].b;
      pixels[i+3] = 255;
    }
    
    // Put the quantized image data back to canvas for exact 5-color visual verification
    ctx.putImageData(imageData, 0, 0);

    // Update the image state with the newly quantized 5-color image
    setImage(canvas.toDataURL('image/png'));


    // 3. Sort colors by BRIGHTNESS (darkest to lightest)
    // This ensures the "Top Layer" is the outline/detail layer (usually black/darkest).
    const sortedColors = [...extractedColors].sort((a, b) => {
      const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
      const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
      return lumA - lumB;
    });

    setColors(sortedColors);
    setOrder(sortedColors.map((_, i) => i));
    setProcessing(false);
  };

  const generateLayers = async () => {
    if (!colors.length || !canvasRef.current) return;
    setProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // Map each pixel to its nearest color index in the 'colors' array
    const pixelMap: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < colors.length; j++) {
        const dist = Math.sqrt(
          Math.pow(pixels[i] - colors[j].r, 2) +
          Math.pow(pixels[i + 1] - colors[j].g, 2) +
          Math.pow(pixels[i + 2] - colors[j].b, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      pixelMap.push(bestIdx);
    }

    const newLayers = [];
    
    for (let i = 0; i < order.length; i++) {
      const margin = 12;
      const keepColorIndices = order.slice(0, i + 1).map(idx => colors[idx].id);
      
      const holeMask = Array.from({ length: h }, () => new Array(w).fill(false));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const isInsideFrame = x >= margin && x < w - margin && y >= margin && y < h - margin;
          if (isInsideFrame) {
            const colorId = colors[pixelMap[y * w + x]].id;
            if (!keepColorIndices.includes(colorId)) {
              holeMask[y][x] = true;
            }
          }
        }
      }

      // --- Structural Processing for ALL Layers ---
      
      // 0. Morphological Cleaning (Despeckle): Remove small noise and fill tiny gaps
      // This makes the layers look much cleaner, like a professional designer's work.
      const cleanedMask = holeMask.map(row => [...row]);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          // Simple median-like filter to remove isolated pixels
          let woodCount = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!holeMask[y + dy][x + dx]) woodCount++;
            }
          }
          // If a wood pixel is mostly surrounded by holes, it's noise -> turn to hole
          if (!holeMask[y][x] && woodCount <= 2) cleanedMask[y][x] = true;
          // If a hole is mostly surrounded by wood, it's a gap -> turn to wood
          if (holeMask[y][x] && woodCount >= 7) cleanedMask[y][x] = false;
        }
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) holeMask[y][x] = cleanedMask[y][x];
      }

      // 1. Dilation (Expansion): Lower layers should be slightly larger than the holes above them
      if (i > 0 && i < order.length - 1) {
        const tempMask = holeMask.map(row => [...row]);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (!tempMask[y][x]) { // Wood
              holeMask[y-1][x] = false;
              holeMask[y+1][x] = false;
              holeMask[y][x-1] = false;
              holeMask[y][x+1] = false;
            }
          }
        }
      }

      // 2. Connectivity Enforcement: Bridge islands to mainland
      const labels = Array.from({ length: h }, () => new Int32Array(w).fill(-1));
      let nextLabel = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!holeMask[y][x] && labels[y][x] === -1) {
            const stack = [[x, y]];
            labels[y][x] = nextLabel;
            while (stack.length > 0) {
              const [cx, cy] = stack.pop()!;
              for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !holeMask[ny][nx] && labels[ny][nx] === -1) {
                  labels[ny][nx] = nextLabel;
                  stack.push([nx, ny]);
                }
              }
            }
            nextLabel++;
          }
        }
      }

      if (nextLabel > 1) {
        const mainlandLabels = new Set<number>();
        for (let x = 0; x < w; x++) {
          if (labels[0][x] !== -1) mainlandLabels.add(labels[0][x]);
          if (labels[h-1][x] !== -1) mainlandLabels.add(labels[h-1][x]);
        }
        for (let y = 0; y < h; y++) {
          if (labels[y][0] !== -1) mainlandLabels.add(labels[y][0]);
          if (labels[y][w-1] !== -1) mainlandLabels.add(labels[y][w-1]);
        }
        
        const mainLabel = mainlandLabels.size > 0 ? Array.from(mainlandLabels)[0] : 0;
        const componentPoints: {x: number, y: number}[][] = Array.from({length: nextLabel}, () => []);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (labels[y][x] !== -1) componentPoints[labels[y][x]].push({x, y});
          }
        }

        const mainlandPoints = componentPoints[mainLabel];
        for (let l = 0; l < nextLabel; l++) {
          if (l === mainLabel || mainlandLabels.has(l)) continue;
          let minDist = Infinity;
          let pIsland = {x:0, y:0}, pMain = {x:0, y:0};
          
          // Sample points for performance
          const islandSample = componentPoints[l].length > 100 ? componentPoints[l].filter((_, idx) => idx % 10 === 0) : componentPoints[l];
          const mainSample = mainlandPoints.length > 500 ? mainlandPoints.filter((_, idx) => idx % 20 === 0) : mainlandPoints;
          
          for (const p1 of islandSample) {
            for (const p2 of mainSample) {
              const d = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
              if (d < minDist) {
                minDist = d;
                pIsland = p1; pMain = p2;
              }
            }
          }
          
          const steps = Math.max(1, Math.sqrt(minDist));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const bx = Math.round(pIsland.x + (pMain.x - pIsland.x) * t);
            const by = Math.round(pIsland.y + (pMain.y - pIsland.y) * t);
            // Thicker bridges for 3.5mm wood (3px wide)
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = bx + dx, ny = by + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) holeMask[ny][nx] = false;
              }
            }
          }
        }
      }

      const rawContours = traceContours(holeMask, w, h);
      const filteredContours = filterContours(rawContours, false);
      const holePath = generateSVGPath(filteredContours);

      // Perfect rectangular outer boundary
      const outerFrame = `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
      
      // Combine: Outer Frame + All Holes/Cutouts
      const svgPath = `${outerFrame} ${holePath}`;

      newLayers.push({
        id: i,
        svg: svgPath,
        color: colors[order[i]],
        name: `Layer ${i + 1} (${i === 0 ? 'Outline / Top Detail' : i === order.length - 1 ? 'Solid Base' : 'Color Layer'})`,
      });
    }

    setLayers(newLayers);
    setProcessing(false);
  };

  const downloadSVG = (layer: typeof layers[0]) => {
    const w = canvasRef.current?.width || 400;
    const h = canvasRef.current?.height || 400;
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <path d="${layer.svg}" fill="none" stroke="black" stroke-width="1" fill-rule="evenodd" />
      </svg>
    `.trim();

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layer.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const moveColor = (from: number, to: number) => {
    const newOrder = [...order];
    const [removed] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, removed);
    setOrder(newOrder);
  };

  return (
    <div className={cn('min-h-screen', 'bg-[#F5F5F0]', 'text-[#141414]', 'font-sans', 'p-4', 'md:p-8')}>
      <header className={cn('max-w-6xl', 'mx-auto', 'mb-12', 'flex', 'flex-col', 'md:flex-row', 'md:items-end', 'justify-between', 'gap-6')}>
        <div>
          <h1 className={cn('text-4xl', 'md:text-6xl', 'font-serif', 'italic', 'tracking-tight', 'mb-2')}>Laser Layer Extractor</h1>
          <p className={cn('text-sm', 'uppercase', 'tracking-widest', 'opacity-60', 'font-mono')}>Image to Multi-Layer SVG for Laser Cutting</p>
        </div>
      </header>

      <main className={cn('max-w-6xl', 'mx-auto', 'grid', 'grid-cols-1', 'lg:grid-cols-12', 'gap-8')}>
        {/* Left Column: Preview & Controls */}
        <div className={cn('lg:col-span-7', 'space-y-8')}>
          <section className={cn('bg-white', 'rounded-3xl', 'p-6', 'shadow-sm', 'border', 'border-black/5', 'overflow-hidden')}>
            <h2 className={cn('text-xs', 'uppercase', 'tracking-widest', 'font-bold', 'opacity-40', 'mb-4')}>Input</h2>
            <div className={cn('flex', 'flex-col', 'gap-4')}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'py-3', 'border', 'border-black/10', 'rounded-xl', 'hover:bg-[#F5F5F0]', 'transition-colors')}
                >
                <Lucide.Upload size={18} />
                <span className={cn('font-bold', 'uppercase', 'tracking-widest', 'text-xs')}>Upload Photo</span>
              </button>

              <button 
                onClick={generateImage}
                disabled={generatingImage || !image}
                className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'py-4', 'bg-[#141414]', 'text-[#F5F5F0]', 'rounded-xl', 'font-bold', 'uppercase', 'tracking-widest', 'text-xs', 'hover:opacity-90', 'disabled:opacity-50')}
              >
                {generatingImage ? <Lucide.RefreshCw size={16} className="animate-spin" /> : <Lucide.Sparkles size={16} />}
                <span>Convert to Pop Art</span>
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
          </section>

          <section className={cn('bg-white', 'rounded-3xl', 'p-6', 'shadow-sm', 'border', 'border-black/5', 'overflow-hidden')}>
            <div className={cn('flex', 'items-center', 'justify-between', 'mb-4')}>
              <h2 className={cn('text-xs', 'uppercase', 'tracking-widest', 'font-bold', 'opacity-40')}>Source Preview</h2>
              {image && (
                <button 
                  onClick={() => { setImage(null); setLayers([]); setColors([]); }}
                  className={cn('p-2', 'hover:bg-red-50', 'text-red-500', 'rounded-full', 'transition-colors')}
                >
                  <Lucide.Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className={cn('aspect-video', 'bg-[#E4E3E0]', 'rounded-2xl', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'relative', 'group')}>
              {image ? (
                <img src={image} alt="Source" className={cn('max-w-full', 'max-h-full', 'object-contain')} referrerPolicy="no-referrer" />
              ) : (
                <div className={cn('text-center', 'opacity-20')}>
                  <Lucide.Image size={64} className={cn('mx-auto', 'mb-4')} />
                  <p className={cn('font-mono', 'text-sm')}>No image uploaded</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {image && colors.length === 0 && (
              <button 
                onClick={processImage}
                disabled={processing}
                className={cn('w-full', 'mt-6', 'py-4', 'border-2', 'border-dashed', 'border-black/10', 'rounded-2xl', 'hover:border-black/30', 'transition-all', 'flex', 'items-center', 'justify-center', 'gap-2', 'group')}
              >
                {processing ? <Lucide.RefreshCw size={20} className="animate-spin" /> : <Lucide.Settings2 size={20} className={cn('group-hover:rotate-90', 'transition-transform')} />}
                <span className={cn('font-bold', 'uppercase', 'tracking-widest', 'text-sm')}>Analyze Colors</span>
              </button>
            )}
          </section>

          {colors.length > 0 && (
            <section className={cn('bg-white', 'rounded-3xl', 'p-6', 'shadow-sm', 'border', 'border-black/5')}>
              <div className={cn('flex', 'items-center', 'justify-between', 'mb-6')}>
                <h2 className={cn('text-xs', 'uppercase', 'tracking-widest', 'font-bold', 'opacity-40')}>Layer Hierarchy (Top to Bottom)</h2>
                <button 
                  onClick={generateLayers}
                  disabled={processing}
                  className={cn('flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'bg-emerald-500', 'text-white', 'rounded-full', 'text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'hover:bg-emerald-600', 'transition-all')}
                >
                  {processing ? <Lucide.RefreshCw size={14} className="animate-spin" /> : <Lucide.Layers size={14} />}
                  <span>Generate SVGs</span>
                </button>
              </div>

              <div className="space-y-3">
                {order.map((colorIdx, i) => {
                  const color = colors[colorIdx];
                  return (
                    <div 
                      key={colorIdx}
                      className={cn('flex', 'items-center', 'gap-4', 'p-4', 'bg-[#F5F5F0]', 'rounded-2xl', 'border', 'border-black/5', 'group')}
                    >
                      <div className={cn('w-6', 'h-6', 'rounded-full', 'border', 'border-black/10', 'shadow-inner')} style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }} />
                      <div className="flex-1">
                        <p className={cn('text-xs', 'font-mono', 'opacity-60')}>
                          RGB({color.r}, {color.g}, {color.b})
                        </p>
                        <p className={cn('text-sm', 'font-bold')}>
                          {i === 0 ? 'Top Layer (Details)' : i === 4 ? 'Bottom Layer (Base)' : `Middle Layer ${i}`}
                        </p>
                      </div>
                      <div className={cn('flex', 'gap-1', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity')}>
                        <button 
                          disabled={i === 0}
                          onClick={() => moveColor(i, i - 1)}
                          className={cn('p-2', 'hover:bg-white', 'rounded-lg', 'disabled:opacity-20')}
                        >
                          <Lucide.ChevronRight size={16} className="-rotate-90" />
                        </button>
                        <button 
                          disabled={i === order.length - 1}
                          onClick={() => moveColor(i, i + 1)}
                          className={cn('p-2', 'hover:bg-white', 'rounded-lg', 'disabled:opacity-20')}
                        >
                          <Lucide.ChevronRight size={16} className="rotate-90" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={cn('mt-4', 'text-[10px]', 'text-center', 'opacity-40', 'font-mono', 'uppercase', 'tracking-tighter')}>
                Drag or use arrows to adjust stacking order. Top layers are cut first/placed on top.
              </p>
            </section>
          )}
        </div>

        {/* Right Column: Generated Layers */}
        <div className="lg:col-span-5">
          <section className={cn('bg-[#141414]', 'text-[#F5F5F0]', 'rounded-3xl', 'p-6', 'shadow-xl', 'sticky', 'top-8')}>
            <h2 className={cn('text-xs', 'uppercase', 'tracking-widest', 'font-bold', 'opacity-40', 'mb-6')}>Output Layers</h2>
            {layers.length > 0 ? (
              <div className="space-y-4">
                {layers.map((layer) => (
                  <div 
                    key={layer.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer group",
                      selectedLayer === layer.id ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <div className={cn('flex', 'items-center', 'justify-between', 'mb-3')}>
                      <div className={cn('flex', 'items-center', 'gap-3')}>
                        <div className={cn('w-3', 'h-3', 'rounded-full')} style={{ backgroundColor: `rgb(${layer.color.r}, ${layer.color.g}, ${layer.color.b})` }} />
                        <span className={cn('text-sm', 'font-bold', 'tracking-tight')}>{layer.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadSVG(layer); }}
                        className={cn('p-2', 'bg-white/10', 'hover:bg-white/20', 'rounded-full', 'transition-colors')}
                        title="Download SVG"
                      >
                        <Lucide.Download size={14} />
                      </button>
                    </div>
                    
                    <div className={cn('aspect-square', 'bg-white/5', 'rounded-xl', 'overflow-hidden', 'relative')}>
                      <svg 
                        viewBox={`0 0 ${canvasRef.current?.width || 400} ${canvasRef.current?.height || 400}`}
                        className={cn('w-full', 'h-full')}
                      >
                        <path 
                          d={layer.svg} 
                          fill="none" 
                          stroke="white" 
                          strokeWidth="1.5" 
                          fillRule="evenodd"
                          className="opacity-60"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => layers.forEach(downloadSVG)}
                  className={cn('w-full', 'mt-4', 'py-4', 'bg-white', 'text-black', 'rounded-2xl', 'font-bold', 'uppercase', 'tracking-widest', 'text-xs', 'hover:bg-opacity-90', 'transition-all')}
                >
                  Download All Layers (.zip logic)
                </button>
              </div>
            ) : (
              <div className={cn('py-20', 'text-center', 'opacity-20')}>
                <Lucide.Layers size={48} className={cn('mx-auto', 'mb-4')} />
                <p className={cn('font-mono', 'text-sm')}>Generate layers to see results</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className={cn('max-w-6xl', 'mx-auto', 'mt-20', 'pt-8', 'border-t', 'border-black/5', 'flex', 'flex-col', 'md:flex-row', 'justify-between', 'gap-4', 'text-[10px]', 'font-mono', 'uppercase', 'tracking-widest', 'opacity-40')}>
        <p>© 2026 Laser Layer Extractor</p>
        <div className={cn('flex', 'gap-6')}>
          <span>Union Logic: Layer i = Σ(Color 1...i)</span>
          <span>No Islands • Closed Contours • Frame Consistent</span>
        </div>
      </footer>
    </div>
  );
}
