import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pill, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { MultiImageResults, type ImageResult } from "@/components/MultiImageResults";
import { DrugList } from "@/components/DrugList";
import { InteractionResults } from "@/components/InteractionResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { drugInteractionAPI } from "./lib/api";

type Step = 1 | 2 | 3;

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [detectedDrugs, setDetectedDrugs] = useState<string[]>([]);
  const [interactionResult, setInteractionResult] = useState<string>("");
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Drug name extraction mutation
  const drugExtractionMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await drugInteractionAPI.extractDrugNamesFromImage(file);
      return result;
    },
    onError: (error) => {
      console.error("Drug extraction error:", error);
    },
  });

  // Drug interaction query mutation
  const interactionMutation = useMutation({
    mutationFn: async (drugs: string[]) => {
      const question = drugs.length === 1 ? `Show me all interactions for ${drugs[0]}` : `What are the interactions between ${drugs.join(", ")}?`;

      const response = await drugInteractionAPI.query(question);
      return response;
    },
    onSuccess: (data) => {
      setInteractionResult(data.answer);
    },
    onError: (error) => {
      console.error("API Error:", error);
      alert("Không thể kiểm tra tương tác. Vui lòng đảm bảo backend đang chạy.");
    },
  });

  // Process multiple images
  const processImages = useCallback(
    async (files: File[]) => {
      setIsProcessingImages(true);
      // Don't clear existing results - append new ones
      setInteractionResult("");

      const newResults: ImageResult[] = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        extractedIngredients: [],
        isLoading: true,
      }));

      setImageResults((prev) => [...prev, ...newResults]);

      // Process each image
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // const result =
          //     await drugInteractionAPI.extractDrugNamesFromImage(file);
          const result = await drugExtractionMutation.mutateAsync(file);

          setImageResults((prev) =>
            prev.map((imgResult) =>
              imgResult.file.name === file.name
                ? {
                    ...imgResult,
                    extractedIngredients: result.result,
                    isLoading: false,
                  }
                : imgResult
            )
          );

          // Add to detected drugs list
          setDetectedDrugs((prev) => {
            const newDrugs = result.result.filter((drug) => !prev.includes(drug));
            return [...prev, ...newDrugs];
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setImageResults((prev) =>
            prev.map((imgResult) =>
              imgResult.file.name === file.name
                ? {
                    ...imgResult,
                    isLoading: false,
                    error: "Không thể trích xuất thành phần",
                  }
                : imgResult
            )
          );
        }
      }

      setIsProcessingImages(false);
    },
    [drugExtractionMutation]
  );

  const handleImageSelect = (files: File[]) => {
    setSelectedImages(files);
    // Don't process immediately - wait for user to click OK button
  };

  const handleStartExtraction = () => {
    if (selectedImages.length > 0) {
      // Only process images that haven't been processed yet
      const processedFileNames = imageResults.map((result) => result.file.name);
      const unprocessedImages = selectedImages.filter((img) => !processedFileNames.includes(img.name));

      if (unprocessedImages.length > 0) {
        processImages(unprocessedImages);
      }
    }
  };

  const handleRemoveImage = (fileName: string) => {
    const newImages = selectedImages.filter((img) => img.name !== fileName);
    setSelectedImages(newImages);

    setImageResults((prev) => {
      const newResults = prev.filter((result) => result.file.name !== fileName);
      return newResults;
    });

    // Update detected drugs list
    const removedResult = imageResults.find((result) => result.file.name === fileName);
    if (removedResult) {
      setDetectedDrugs((prev) => prev.filter((drug) => !removedResult.extractedIngredients.includes(drug)));
    }
  };

  const handleRetryImage = (fileName: string) => {
    const file = selectedImages.find((img) => img.name === fileName);
    if (file) {
      processImages([file]);
    }
  };

  const handleRemoveDrug = (drug: string) => {
    setDetectedDrugs((prev) => prev.filter((d) => d !== drug));
    setInteractionResult("");
  };

  const handleCheckInteractions = () => {
    if (detectedDrugs.length === 0) {
      alert("Vui lòng tải lên hình ảnh có tên thuốc trước.");
      return;
    }
    interactionMutation.mutate(detectedDrugs);
    setCurrentStep(3);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // Reset to step 1 when clearing
  const handleClearImages = () => {
    setSelectedImages([]);
    setImageResults([]);
    setDetectedDrugs([]);
    setInteractionResult("");
    setCurrentStep(1);
  };

  const isProcessing = isProcessingImages;
  const isCheckingInteractions = interactionMutation.isPending;

  const steps = [
    { number: 1, title: "Tải Lên & Xác Nhận", description: "Tải lên hình ảnh và xác nhận thuốc" },
    { number: 2, title: "Kiểm Tra Tương Tác", description: "Phân tích tương tác thuốc" },
    { number: 3, title: "Kết Quả", description: "Xem kết quả kiểm tra" },
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return detectedDrugs.length > 0 && !isProcessingImages;
      case 2:
        return detectedDrugs.length > 0 && (interactionResult || isCheckingInteractions);
      case 3:
        return false;
      default:
        return false;
    }
  };

  const canGoPrevious = () => {
    return currentStep > 1;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Pill className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Kiểm Tra Tương Tác Thuốc</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Tải lên hình ảnh nhãn thuốc để trích xuất thành phần hoạt chất và kiểm tra các tương tác thuốc tiềm ẩn
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const isAccessible = step.number <= currentStep || isCompleted;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (isAccessible) {
                          setCurrentStep(step.number as Step);
                        }
                      }}
                      disabled={!isAccessible}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground scale-110"
                          : isCompleted
                          ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {isCompleted ? "✓" : step.number}
                    </button>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 rounded transition-all ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Upload, Extract, and Confirm (Grouped) */}
          {currentStep === 1 && (
            <>
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Bước 1: Tải Lên Hình Ảnh</CardTitle>
                  <CardDescription>Tải lên hình ảnh nhãn thuốc để trích xuất thành phần hoạt chất</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onClear={handleClearImages}
                    selectedImages={selectedImages}
                    isProcessing={isProcessing}
                    maxFiles={5}
                    alwaysShowUpload={true}
                  />

                  {/* OK Button to Start Extraction */}
                  {selectedImages.length > imageResults.length && !isProcessingImages && (
                    <div className="mt-4">
                      <Button variant="default" onClick={handleStartExtraction} disabled={isProcessing} className="w-full" size="lg">
                        {imageResults.length === 0
                          ? "OK - Trích Xuất Tên Thuốc"
                          : `Trích xuất ${selectedImages.length - imageResults.length} hình ảnh nữa`}
                      </Button>
                    </div>
                  )}

                  {/* Processing Progress */}
                  {isProcessingImages && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Đang xử lý hình ảnh...</span>
                        <span className="font-medium">
                          {imageResults.filter((r) => !r.isLoading).length} trong {selectedImages.length} đã hoàn thành
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              selectedImages.length > 0 ? (imageResults.filter((r) => !r.isLoading).length / selectedImages.length) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Ingredients Section */}
              {imageResults.length > 0 && (
                <MultiImageResults results={imageResults} onRemoveImage={handleRemoveImage} onRetryImage={handleRetryImage} />
              )}

              {/* Detected Drugs Section */}
              {detectedDrugs.length > 0 && (
                <DrugList drugs={detectedDrugs} onRemoveDrug={handleRemoveDrug} onAddDrug={(drug) => setDetectedDrugs([...detectedDrugs, drug])} />
              )}
            </>
          )}

          {/* Step 2: Check Interactions */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 2: Kiểm Tra Tương Tác</CardTitle>
                <CardDescription>Phân tích các thuốc đã phát hiện để tìm các tương tác tiềm ẩn</CardDescription>
              </CardHeader>
              <CardContent>
                {detectedDrugs.length > 0 ? (
                  <Button
                    variant="default"
                    onClick={handleCheckInteractions}
                    disabled={detectedDrugs.length === 0 || isCheckingInteractions}
                    className="w-full"
                    size="lg"
                  >
                    {isCheckingInteractions ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang Kiểm Tra Tương Tác...
                      </>
                    ) : (
                      `Kiểm Tra Tương Tác cho ${detectedDrugs.length} Thuốc`
                    )}
                  </Button>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Chưa có thuốc nào để kiểm tra. Vui lòng quay lại bước 1.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Results */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Bước 3: Kết Quả</CardTitle>
                <CardDescription>Kết quả kiểm tra tương tác thuốc</CardDescription>
              </CardHeader>
              <CardContent>
                {interactionResult || isCheckingInteractions ? (
                  <InteractionResults result={interactionResult} isLoading={isCheckingInteractions} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Chưa có kết quả. Vui lòng quay lại bước 2 để kiểm tra tương tác.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center gap-4">
            <Button variant="outline" onClick={handlePrevious} disabled={!canGoPrevious()}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay Lại
            </Button>
            <div className="text-sm text-muted-foreground">
              Bước {currentStep} / {steps.length}
            </div>
            <Button variant="default" onClick={handleNext} disabled={!canGoNext() || currentStep === 3}>
              Tiếp Theo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Info Footer */}
          <Card className="bg-accent border-border">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="text-accent-foreground mt-1">ℹ️</div>
                <div className="text-sm text-accent-foreground">
                  <p className="font-medium mb-1">Thông Báo Quan Trọng</p>
                  <p>
                    Công cụ này chỉ mang tính chất tham khảo. Luôn tham khảo ý kiến của chuyên gia y tế trước khi thay đổi bất kỳ chế độ dùng thuốc
                    nào. Đây không phải là thay thế cho lời khuyên y tế chuyên nghiệp.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
