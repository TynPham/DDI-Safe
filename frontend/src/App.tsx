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
import { defineStepper } from "@/components/ui/stepper";

const { Stepper } = defineStepper(
  {
    id: "upload",
    title: "Tải Lên Hình Ảnh",
  },
  {
    id: "check",
    title: "Trích Xuất Thành Phần",
  },
  {
    id: "results",
    title: "Kết Quả",
  }
);

function App() {
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
    // Don't process immediately - just upload
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
  };

  // Reset to step 1 when clearing
  const handleClearImages = (reset: () => void) => {
    setSelectedImages([]);
    setImageResults([]);
    setDetectedDrugs([]);
    setInteractionResult("");
    setIsProcessingImages(false);
    reset();
  };

  // Reset all state and step
  const handleResetAll = (reset: () => void) => {
    setSelectedImages([]);
    setImageResults([]);
    setDetectedDrugs([]);
    setInteractionResult("");
    setIsProcessingImages(false);
    // Reset mutations
    drugExtractionMutation.reset();
    interactionMutation.reset();
    reset();
  };

  const isProcessing = isProcessingImages;
  const isCheckingInteractions = interactionMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-4 shadow-lg ring-4 ring-primary/10">
              <Pill className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-5xl leading-14 font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Kiểm Tra Tương Tác Thuốc
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Tải lên hình ảnh nhãn thuốc để trích xuất thành phần hoạt chất và kiểm tra các tương tác thuốc tiềm ẩn
          </p>
        </div>

        <Stepper.Provider className="space-y-8" variant="horizontal">
          {({ methods }) => (
            <>
              {/* Step Navigation */}
              <div className="mb-10">
                <Stepper.Navigation>
                  {methods.all.map((step) => (
                    <Stepper.Step key={step.id} of={step.id} onClick={() => methods.goTo(step.id)}>
                      <Stepper.Title className="text-base font-semibold">{step.title}</Stepper.Title>
                      <Stepper.Description className="text-xs text-muted-foreground">
                        {step.id === "upload" && "Tải lên hình ảnh nhãn thuốc"}
                        {step.id === "check" && "Trích xuất thành phần hoạt chất từ hình ảnh"}
                        {step.id === "results" && "Xem kết quả kiểm tra tương tác"}
                      </Stepper.Description>
                    </Stepper.Step>
                  ))}
                </Stepper.Navigation>
              </div>

              {/* Main Content */}
              <div className="space-y-6">
                {methods.switch({
                  upload: () => (
                    <>
                      {/* Upload Section - Step 1: Just upload images */}
                      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                          <CardTitle className="text-2xl font-bold">Bước 1: Tải Lên Hình Ảnh</CardTitle>
                          <CardDescription className="text-base">Tải lên hình ảnh nhãn thuốc để trích xuất thành phần hoạt chất</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ImageUpload
                            onImageSelect={handleImageSelect}
                            onClear={() => handleClearImages(methods.reset)}
                            selectedImages={selectedImages}
                            isProcessing={false}
                            maxFiles={5}
                            alwaysShowUpload={true}
                          />
                        </CardContent>
                      </Card>
                    </>
                  ),
                  check: () => (
                    <>
                      {/* Step 2: Extracting Medicinal Ingredients */}
                      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                          <CardTitle className="text-2xl font-bold">Bước 2: Trích Xuất Thành Phần</CardTitle>
                          <CardDescription className="text-base">Trích xuất thành phần hoạt chất từ hình ảnh đã tải lên</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {selectedImages.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <Pill className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <p className="text-base">Chưa có hình ảnh nào được tải lên. Vui lòng quay lại bước 1 để tải lên hình ảnh.</p>
                            </div>
                          ) : (
                            <>
                              {/* Start Extraction Button */}
                              {selectedImages.length > imageResults.length && !isProcessingImages && (
                                <div className="mb-6">
                                  <Button
                                    variant="default"
                                    onClick={handleStartExtraction}
                                    disabled={isProcessing}
                                    className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                    size="lg"
                                  >
                                    {imageResults.length === 0
                                      ? "Bắt Đầu Trích Xuất"
                                      : `Trích xuất thêm ${selectedImages.length - imageResults.length} hình ảnh`}
                                  </Button>
                                </div>
                              )}

                              {/* Processing Progress */}
                              {isProcessingImages && (
                                <div className="mb-6 space-y-3 p-4 bg-muted/50 rounded-lg border mt-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">Đang xử lý hình ảnh...</span>
                                    <span className="font-semibold text-primary">
                                      {imageResults.filter((r) => !r.isLoading).length} / {selectedImages.length} đã hoàn thành
                                    </span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                      className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                                      style={{
                                        width: `${
                                          selectedImages.length > 0
                                            ? (imageResults.filter((r) => !r.isLoading).length / selectedImages.length) * 100
                                            : 0
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Extracted Ingredients Section */}
                              {imageResults.length > 0 && (
                                <div className="mt-4">
                                  <MultiImageResults results={imageResults} onRemoveImage={handleRemoveImage} onRetryImage={handleRetryImage} />
                                </div>
                              )}

                              {/* Detected Drugs Section */}
                              {detectedDrugs.length > 0 && (
                                <DrugList
                                  drugs={detectedDrugs}
                                  onRemoveDrug={handleRemoveDrug}
                                  onAddDrug={(drug) => setDetectedDrugs([...detectedDrugs, drug])}
                                />
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ),
                  results: () => (
                    <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                        <CardTitle className="text-2xl font-bold">Bước 3: Kết Quả</CardTitle>
                        <CardDescription className="text-base">Kiểm tra tương tác thuốc và xem kết quả</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {detectedDrugs.length > 0 ? (
                          <>
                            {!interactionResult && !isCheckingInteractions && (
                              <div className="mb-6">
                                <Button
                                  variant="default"
                                  onClick={handleCheckInteractions}
                                  disabled={detectedDrugs.length === 0 || isCheckingInteractions}
                                  className="w-full h-14 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
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
                              </div>
                            )}
                            {(interactionResult || isCheckingInteractions) && (
                              <InteractionResults result={interactionResult} isLoading={isCheckingInteractions} />
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                              <Pill className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-base">Chưa phát hiện thuốc nào. Vui lòng quay lại bước 2 để trích xuất thành phần.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ),
                })}

                {/* Navigation Buttons */}
                <Stepper.Controls className="pt-6 border-t">
                  {!methods.isFirst && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={methods.prev}
                      className="h-11 px-6 font-medium shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Quay Lại
                    </Button>
                  )}
                  {methods.isLast ? (
                    <Button
                      type="button"
                      onClick={() => handleResetAll(methods.reset)}
                      className="h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Bắt Đầu Lại
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      onClick={methods.next}
                      disabled={
                        (methods.current.id === "upload" && selectedImages.length === 0) ||
                        (methods.current.id === "check" && (isProcessingImages || detectedDrugs.length === 0))
                      }
                      className="h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Tiếp Theo
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </Stepper.Controls>

                {/* Info Footer */}
                <Card className="bg-gradient-to-r from-accent/50 to-accent/30 border-2 border-accent/50 shadow-md">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        ℹ️
                      </div>
                      <div className="text-sm text-accent-foreground flex-1">
                        <p className="font-semibold mb-2 text-base">Thông Báo Quan Trọng</p>
                        <p className="leading-relaxed">
                          Công cụ này chỉ mang tính chất tham khảo. Luôn tham khảo ý kiến của chuyên gia y tế trước khi thay đổi bất kỳ chế độ dùng
                          thuốc nào. Đây không phải là thay thế cho lời khuyên y tế chuyên nghiệp.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </Stepper.Provider>
      </div>
    </div>
  );
}

export default App;
