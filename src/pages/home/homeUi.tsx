/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { cn } from '../../lib/utils';

export default function HomeUi() {
  const [selectedColor, setSelectedColor] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const colors = [
    { name: 'Orange', color: '#FF6B35', selected: true },
    { name: 'Red', color: '#FF4444', selected: false },
    { name: 'Yellow', color: '#FFD700', selected: false },
    { name: 'Purple', color: '#8B5CF6', selected: false },
    { name: 'Blue', color: '#3B82F6', selected: false },
  ];

  return (
    <div className={cn('min-h-screen', 'bg-gray-900', 'text-white')}>
      {/* Header */}
      <header className={cn('flex', 'items-center', 'justify-between', 'px-6', 'py-4', 'border-b', 'border-gray-800')}>
        <div className={cn('flex', 'items-center', 'gap-4')}>
          <div className={cn('text-orange-500', 'font-bold', 'text-xl')}>LaserMaker</div>
          <nav className={cn('flex', 'gap-6', 'ml-8')}>
            <a href="#" className={cn('text-gray-300', 'hover:text-white', 'transition-colors')}>Tools</a>
            <a href="#" className={cn('text-gray-300', 'hover:text-white', 'transition-colors')}>Templates</a>
          </nav>
        </div>
        <div className={cn('flex', 'items-center', 'gap-4')}>
          <span className="text-gray-300">Admin</span>
          <div className={cn('w-8', 'h-8', 'bg-orange-500', 'rounded-full', 'flex', 'items-center', 'justify-center')}>
            <Lucide.User size={16} />
          </div>
        </div>
      </header>

      <div className={cn('container', 'mx-auto', 'px-6', 'py-8')}>
        <div className={cn('grid', 'grid-cols-1', 'lg:grid-cols-12', 'gap-6', 'max-w-7xl', 'mx-auto', 'h-[calc(100vh-80px)]')}>
          
          {/* Left Side - Upload Section (占满左侧高度) */}
          <div className={cn('lg:col-span-5', 'h-full')}>
            <div className={cn('bg-gray-800', 'rounded-lg', 'p-6', 'border', 'border-gray-700', 'h-full', 'flex', 'flex-col')}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              {image ? (
                <div className={cn('relative', 'flex-1', 'flex', 'items-center', 'justify-center')}>
                  <img src={image} alt="Uploaded" className={cn('w-full', 'h-full', 'rounded-lg', 'object-contain')} />
                  <button 
                    onClick={() => setImage(null)}
                    className={cn('absolute', 'top-2', 'right-2', 'p-2', 'bg-red-500', 'rounded-full', 'hover:bg-red-600', 'transition-colors')}
                  >
                    <Lucide.Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div 
                  className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'flex-1', 'border-2', 'border-dashed', 'border-gray-600', 'rounded-lg', 'hover:border-orange-500', 'transition-colors', 'cursor-pointer')}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={cn('w-16', 'h-16', 'bg-orange-500', 'rounded-full', 'flex', 'items-center', 'justify-center', 'mb-4')}>
                    <Lucide.Upload size={24} />
                  </div>
                  <h3 className={cn('text-lg', 'font-semibold', 'mb-2')}>Upload Pet Photo</h3>
                  <p className={cn('text-gray-400', 'text-sm')}>Click to browse or drag and drop</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className={cn('lg:col-span-7', 'flex', 'flex-col', 'gap-4', 'h-full', 'overflow-hidden')}>
            {/* Preview Section (右上方) */}
            <div className={cn('bg-gray-800', 'rounded-lg', 'p-4', 'border', 'border-gray-700')}>
              <h3 className={cn('text-sm', 'font-semibold', 'mb-3', 'text-gray-400')}>Preview</h3>
              <div className={cn('grid', 'grid-cols-3', 'gap-3')}>
                <div className={cn('aspect-[4/3]', 'bg-gray-700', 'rounded-lg', 'border-2', 'border-orange-500', 'flex', 'items-center', 'justify-center')}>
                  <div className="text-center">
                    <Lucide.Sparkles size={20} className={cn('mx-auto', 'mb-1', 'text-orange-500')} />
                    <span className={cn('text-xs', 'text-orange-500')}>Pop Art</span>
                  </div>
                </div>
                <div className={cn('aspect-[4/3]', 'bg-gray-700', 'rounded-lg', 'border', 'border-gray-600', 'flex', 'items-center', 'justify-center')}>
                  <div className="text-center">
                    <Lucide.Palette size={20} className={cn('mx-auto', 'mb-1', 'text-gray-400')} />
                    <span className={cn('text-xs', 'text-gray-400')}>Pixel Art</span>
                  </div>
                </div>
                <div className={cn('aspect-[4/3]', 'bg-gray-700', 'rounded-lg', 'border', 'border-gray-600', 'flex', 'items-center', 'justify-center')}>
                  <div className="text-center">
                    <Lucide.Layers size={20} className={cn('mx-auto', 'mb-1', 'text-gray-400')} />
                    <span className={cn('text-xs', 'text-gray-400')}>Ukiyo-e</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Selection (紧凑) */}
            <div className={cn('bg-gray-800', 'rounded-lg', 'p-4', 'border', 'border-gray-700', 'flex-1', 'overflow-auto')}>
              <div className={cn('flex', 'items-center', 'justify-between', 'mb-3')}>
                <h3 className={cn('text-sm', 'font-semibold', 'text-gray-400')}>Layers & Colors</h3>
                <span className={cn('text-xs', 'text-gray-500')}>5 layers</span>
              </div>
              <div className="space-y-2">
                {colors.map((color, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all",
                      selectedColor === index ? "bg-gray-700 border border-orange-500" : "hover:bg-gray-700 border border-transparent"
                    )}
                    onClick={() => setSelectedColor(index)}
                  >
                    <div 
                      className={cn('w-5', 'h-5', 'rounded')}
                      style={{ backgroundColor: color.color }}
                    ></div>
                    <div className="flex-1">
                      <span className={cn('text-sm', 'text-white')}>{color.name}</span>
                      <p className={cn('text-xs', 'text-gray-500')}>Layer {index + 1}</p>
                    </div>
                    {selectedColor === index && (
                      <Lucide.Check size={14} className={cn('text-orange-500')} />
                    )}
                  </div>
                ))}
              </div>

              <div className={cn('mt-4', 'p-3', 'bg-gray-700', 'rounded-lg')}>
                <div className={cn('text-xs', 'text-gray-300')}>Input / Output Files / Output Files</div>
                <p className={cn('text-xs', 'text-gray-500', 'mt-1')}>Ready for processing...</p>
              </div>
            </div>

            {/* Generate Button */}
            <button className={cn('w-full', 'py-4', 'bg-linear-to-r', 'from-orange-500', 'to-purple-600', 'rounded-lg', 'font-semibold', 'text-white', 'hover:from-orange-600', 'hover:to-purple-700', 'transition-all', 'transform', 'hover:scale-[1.02]')}>
              Genarate AI style
            </button>
            
            <button className={cn('w-full', 'py-4', 'bg-linear-to-r', 'from-orange-500', 'to-purple-600', 'rounded-lg', 'font-semibold', 'text-white', 'hover:from-orange-600', 'hover:to-purple-700', 'transition-all', 'transform', 'hover:scale-[1.02]')}>
              Generate AI SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}