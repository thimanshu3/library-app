'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onScan, onClose }: { onScan: (result: string) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let controls: any;

    const startScanner = async () => {
      try {
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (videoInputDevices.length === 0) {
          setError('No camera found on this device.');
          return;
        }
        
        // Prefer rear camera if available
        const deviceId = videoInputDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'))?.deviceId || videoInputDevices[0].deviceId;

        controls = await codeReader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, error) => {
          if (result) {
            onScan(result.getText());
            if (controls) controls.stop();
          }
        });
      } catch (err) {
        console.error(err);
        setError('Failed to start camera. Please ensure permissions are granted.');
      }
    };

    startScanner();

    return () => {
      if (controls) {
        controls.stop();
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl relative w-full max-w-sm border border-white/10">
        <div className="p-4 flex justify-between items-center border-b border-white/10 bg-neutral-800">
          <h3 className="text-white font-bold text-sm">Scan Barcode / ISBN</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-400 text-sm font-medium">
              {error}
            </div>
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" />
          )}
          
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-xl relative">
                <div className="w-full h-[2px] bg-red-500/80 absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
