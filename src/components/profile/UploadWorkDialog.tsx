"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumButton } from "@/components/ui/premium-button";
import { Image as ImageIcon, Video, UploadCloud, X } from "lucide-react";
import Image from "next/image";

interface UploadWorkDialogProps {
  children: React.ReactNode;
}

export function UploadWorkDialog({ children }: UploadWorkDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileType, setFileType] = useState<'photo' | 'video'>('photo');
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setFileType(file.type.startsWith('video/') ? 'video' : 'photo');
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background/80 backdrop-blur-xl border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline uppercase tracking-widest text-center">Subir Nuevo Trabajo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          
          {/* File Upload Area */}
          <div className="space-y-2">
             {!preview ? (
                <label className="flex flex-col items-center justify-center h-48 w-full border-2 border-dashed border-border rounded-2xl bg-foreground/5 hover:bg-foreground/[0.05] hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="w-16 h-16 rounded-full bg-foreground/5 group-hover:bg-primary/20 flex items-center justify-center transition-colors mb-4">
                    <UploadCloud className="w-8 h-8 text-foreground/60 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-foreground/60 group-hover:text-foreground transition-colors">Haz clic para subir foto o video</span>
                  <span className="text-xs text-foreground/40 mt-1">MP4, JPG, PNG hasta 50MB</span>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                </label>
             ) : (
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-foreground/5 border border-border group">
                   {fileType === 'photo' ? (
                      <Image src={preview} alt="Preview" fill className="object-cover" />
                   ) : (
                      <video src={preview} className="w-full h-full object-cover" controls />
                   )}
                   <button 
                     onClick={handleRemoveFile}
                     className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-foreground backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <X className="w-4 h-4" />
                   </button>
                   {fileType === 'video' && (
                     <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1 text-xs">
                        <Video className="w-3 h-3" /> Video
                     </div>
                   )}
                </div>
             )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground/80">Descripción</Label>
            <Textarea 
              id="description" 
              placeholder="Ej. Corte texturizado con mid fade. Ideal para cabello grueso..." 
              className="bg-foreground/5 border-border text-foreground placeholder:text-foreground/40 focus-visible:ring-primary h-24 resize-none"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-4">
           <Button variant="ghost" onClick={() => setOpen(false)} className="hover:bg-foreground/10 text-foreground/80">
              Cancelar
           </Button>
           <PremiumButton onClick={() => setOpen(false)}>
              Publicar Trabajo
           </PremiumButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
