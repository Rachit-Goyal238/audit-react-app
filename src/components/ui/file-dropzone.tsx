import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from 'cn';

interface FileDropzoneProps {
  id?: string;
  accept?: string;
  multiple?: boolean;
  file?: File | null;
  onFileSelect: (file: File | null) => void;
  onFilesSelect?: (files: File[]) => void;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export function FileDropzone({
  id,
  accept,
  multiple = false,
  file,
  onFileSelect,
  onFilesSelect,
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const validateFileExtension = (testFile: File): boolean => {
    if (!accept) return true;
    const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
    const fileName = testFile.name.toLowerCase();
    const fileType = testFile.type.toLowerCase();

    return acceptedTypes.some((extOrMime) => {
      if (extOrMime.startsWith('.')) {
        return fileName.endsWith(extOrMime);
      }
      if (extOrMime.includes('/*')) {
        const prefix = extOrMime.replace('/*', '');
        return fileType.startsWith(prefix);
      }
      return fileType === extOrMime;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;

    if (multiple) {
      const validFiles = droppedFiles.filter(validateFileExtension);
      if (validFiles.length > 0) {
        if (onFilesSelect) {
          onFilesSelect(validFiles);
        } else if (onFileSelect) {
          onFileSelect(validFiles[0]);
        }
      }
    } else {
      const validFile = droppedFiles.find(validateFileExtension) || droppedFiles[0];
      if (validFile) {
        onFileSelect(validFile);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files ? Array.from(e.target.files) : [];
    if (!inputFiles.length) return;

    if (multiple) {
      if (onFilesSelect) {
        onFilesSelect(inputFiles);
      } else if (onFileSelect) {
        onFileSelect(inputFiles[0]);
      }
    } else {
      onFileSelect(inputFiles[0] || null);
    }

    // Reset input value so the same file can be re-selected if removed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Render selected single file card if a file is already loaded
  if (file && !multiple) {
    return (
      <div className={cn('p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between', className)}>
        <div className="flex items-center gap-2.5 truncate">
          <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs', iconBgColor, iconColor)}>
            {icon || <CheckCircle2 className="size-4" />}
          </div>
          <div className="truncate">
            <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-[10px] text-slate-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFileSelect(null);
          }}
          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          title="Remove file"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      role="button"
      aria-label={title}
      className={cn(
        'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 outline-none select-none',
        isDragging
          ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10 scale-[1.01]'
          : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 focus-visible:ring-2 focus-visible:ring-blue-500/30',
        className
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
      />
      
      <div
        className={cn(
          'size-10 rounded-xl flex items-center justify-center mb-2 transition-transform duration-200',
          isDragging ? 'scale-110 bg-blue-100 text-blue-600' : `${iconBgColor} ${iconColor}`
        )}
      >
        {isDragging ? <UploadCloud className="size-5 animate-bounce" /> : (icon || <UploadCloud className="size-5" />)}
      </div>

      <span className="text-xs font-semibold text-slate-800">
        {isDragging ? 'Drop file here to upload' : title}
      </span>
      <span className="text-[10px] text-slate-400 mt-0.5">
        {isDragging ? 'Release mouse button now' : subtitle}
      </span>
    </div>
  );
}
