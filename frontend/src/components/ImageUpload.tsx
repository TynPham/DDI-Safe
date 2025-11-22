import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (files: File[]) => void;
  onClear: () => void;
  selectedImages: File[];
  isProcessing?: boolean;
  maxFiles?: number;
  alwaysShowUpload?: boolean;
}

export function ImageUpload({
  onImageSelect,
  onClear,
  selectedImages,
  isProcessing = false,
  maxFiles = 5,
  alwaysShowUpload = false,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  // Recreate previews from selectedImages when component mounts or selectedImages changes
  useEffect(() => {
    setPreviews((prevPreviews) => {
      // Find files that need previews
      const filesNeedingPreviews = selectedImages.filter((file) => !prevPreviews[file.name]);

      if (filesNeedingPreviews.length === 0) {
        // Clean up previews for removed files
        const currentFileNames = selectedImages.map((img) => img.name);
        const previewsToKeep: { [key: string]: string } = {};
        Object.keys(prevPreviews).forEach((key) => {
          if (currentFileNames.includes(key)) {
            previewsToKeep[key] = prevPreviews[key];
          }
        });
        return previewsToKeep;
      }

      // Create previews for new files
      const newPreviews: { [key: string]: string } = { ...prevPreviews };
      const previewPromises: Promise<void>[] = [];

      filesNeedingPreviews.forEach((file) => {
        const promise = new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews[file.name] = reader.result as string;
            resolve();
          };
          reader.readAsDataURL(file);
        });
        previewPromises.push(promise);
      });

      // Wait for all previews to be created, then update state
      Promise.all(previewPromises).then(() => {
        // Clean up previews for removed files
        const currentFileNames = selectedImages.map((img) => img.name);
        const finalPreviews: { [key: string]: string } = {};
        Object.keys(newPreviews).forEach((key) => {
          if (currentFileNames.includes(key)) {
            finalPreviews[key] = newPreviews[key];
          }
        });
        setPreviews(finalPreviews);
      });

      // Return existing previews for now, will be updated by Promise.all
      return prevPreviews;
    });
  }, [selectedImages]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const newFiles = [...selectedImages, ...acceptedFiles].slice(0, maxFiles);
        onImageSelect(newFiles);

        // Create previews for new files
        acceptedFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews((prev) => ({
              ...prev,
              [file.name]: reader.result as string,
            }));
          };
          reader.readAsDataURL(file);
        });
      }
    },
    [onImageSelect, selectedImages, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp"],
    },
    maxFiles: maxFiles - selectedImages.length,
    disabled: isProcessing || selectedImages.length >= maxFiles,
  });

  const handleClear = () => {
    setPreviews({});
    onClear();
  };

  const handleRemoveImage = (fileName: string) => {
    const newImages = selectedImages.filter((img) => img.name !== fileName);
    onImageSelect(newImages);

    const newPreviews = { ...previews };
    delete newPreviews[fileName];
    setPreviews(newPreviews);
  };

  // Show uploaded images if any, and always show upload interface if alwaysShowUpload is true
  const showUploadedImages = selectedImages.length > 0;
  const showUploadInterface = alwaysShowUpload || selectedImages.length === 0;

  if (showUploadedImages && !alwaysShowUpload) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedImages.map((image, index) => (
            <div
              key={image.name}
              className="relative rounded-lg border-2 border-dashed border-border overflow-hidden group hover:border-primary/50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <img
                src={previews[image.name]}
                alt={`Nhãn thuốc đã tải lên ${index + 1}`}
                className="w-full h-auto max-h-64 object-contain transition-transform duration-200 group-hover:scale-105"
              />
              {!isProcessing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => handleRemoveImage(image.name)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 to-foreground/70 text-background p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm">
                  <FileImage className="h-4 w-4" />
                  <span className="truncate font-medium">{image.name}</span>
                  <span className="text-xs opacity-80">({(image.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedImages.length < maxFiles && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md",
              isDragActive ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50 hover:bg-primary/5",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-5 shadow-md">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold">{isDragActive ? "Thả thêm hình ảnh vào đây" : "Tải lên từ tệp"}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Đã chọn {selectedImages.length} hình ảnh</span>
          {selectedImages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isProcessing}>
              Xóa Tất Cả
            </Button>
          )}
        </div>
      </div>
    );
  }

  // When alwaysShowUpload is true, show both uploaded images and upload interface
  if (showUploadedImages && alwaysShowUpload) {
    return (
      <div className="space-y-4 mt-4">
        {/* Uploaded Images */}
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Nhãn thuốc đã tải lên:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedImages.map((image, index) => (
              <div
                key={image.name}
                className="relative rounded-lg border-2 border-dashed border-border overflow-hidden group hover:border-primary/50 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <img
                  src={previews[image.name]}
                  alt={`Nhãn thuốc đã tải lên ${index + 1}`}
                  className="w-full h-auto max-h-64 object-contain transition-transform duration-200 group-hover:scale-105"
                />
                {!isProcessing && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => handleRemoveImage(image.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 to-foreground/70 text-background p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm">
                    <FileImage className="h-4 w-4" />
                    <span className="truncate font-medium">{image.name}</span>
                    <span className="text-xs opacity-80">({(image.size / 1024).toFixed(1)} KB)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Interface */}
        {selectedImages.length < maxFiles && showUploadInterface && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md",
              isDragActive ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50 hover:bg-primary/5",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-5 shadow-md">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold">{isDragActive ? "Thả thêm hình ảnh vào đây" : "Tải lên từ tệp"}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Đã chọn {selectedImages.length} hình ảnh</span>
          {selectedImages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isProcessing}>
              Xóa Tất Cả
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-primary/10 p-6">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">{isDragActive ? "Thả hình ảnh vào đây" : "Tải lên hình ảnh nhãn thuốc"}</p>
            <p className="text-sm text-muted-foreground">Kéo thả hình ảnh hoặc nhấp để chọn</p>
            <p className="text-xs text-muted-foreground">Hỗ trợ: PNG, JPG, JPEG, GIF, BMP (tối đa {maxFiles} hình ảnh)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
