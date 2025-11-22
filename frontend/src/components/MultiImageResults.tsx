import { Fragment, useState } from "react";
import { FileImage, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

export interface ImageResult {
  file: File;
  preview: string;
  extractedIngredients: string[];
  isLoading: boolean;
  error?: string;
}

interface MultiImageResultsProps {
  results: ImageResult[];
  onRemoveImage: (fileName: string) => void;
  onRetryImage: (fileName: string) => void;
}

export function MultiImageResults({ results, onRemoveImage, onRetryImage }: MultiImageResultsProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const getStatusIcon = (result: ImageResult) => {
    if (result.isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (result.error) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (result.extractedIngredients.length > 0) {
      return <CheckCircle className="h-4 w-4 text-primary" />;
    }
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = (result: ImageResult) => {
    if (result.isLoading) {
      return "Đang xử lý...";
    }
    if (result.error) {
      return "Lỗi";
    }
    if (result.extractedIngredients.length > 0) {
      return `${result.extractedIngredients.length} thành phần đã tìm thấy`;
    }
    return "Không tìm thấy thành phần";
  };

  const getStatusColor = (result: ImageResult) => {
    if (result.isLoading) {
      return "bg-accent border-border text-accent-foreground";
    }
    if (result.error) {
      return "bg-destructive/10 border-destructive/20 text-destructive";
    }
    if (result.extractedIngredients.length > 0) {
      return "bg-primary/10 border-primary/20 text-primary";
    }
    return "bg-muted border-border text-muted-foreground";
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <CardTitle className="text-xl font-bold">Thành Phần Hoạt Chất Đã Trích Xuất</CardTitle>
        <CardDescription className="text-base">Xem lại các thành phần hoạt chất được trích xuất từ mỗi hình ảnh thuốc</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 mt-4">
        <div className="space-y-4">
          {results.map((result, index) => (
            <Fragment key={result.file.name}>
              <Card key={result.file.name} className="overflow-hidden border-2 hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Image Preview */}
                    <div className="w-36 h-36 shrink-0 relative group">
                      <img
                        src={result.preview}
                        alt={`Nhãn thuốc ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                        onClick={() => setExpandedImage(expandedImage === result.file.name ? null : result.file.name)}
                      />
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                        {getStatusIcon(result)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <FileImage className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm truncate">{result.file.name}</span>
                            <span className="text-xs text-muted-foreground">({(result.file.size / 1024).toFixed(1)} KB)</span>
                          </div>

                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className={`${getStatusColor(result)} font-medium px-3 py-1`}>
                              {getStatusText(result)}
                            </Badge>
                          </div>

                          {/* Error Message */}
                          {result.error && <div className="text-sm text-red-600 mb-3">{result.error}</div>}

                          {/* Extracted Ingredients */}
                          {result.extractedIngredients.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-foreground mb-2">Thành Phần Hoạt Chất:</p>
                              <div className="flex flex-wrap gap-2">
                                {result.extractedIngredients.map((ingredient, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs px-3 py-1 bg-primary/10 text-primary border-primary/20 font-medium"
                                  >
                                    {ingredient}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {result.error && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRetryImage(result.file.name)}
                              className="shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              Thử Lại
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemoveImage(result.file.name)}
                            className="shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Image Modal */}
              {expandedImage === result.file.name && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{result.file.name}</h3>
                      <Button variant="outline" size="sm" onClick={() => setExpandedImage(null)}>
                        Đóng
                      </Button>
                    </div>
                    <div className="p-4">
                      <img src={result.preview} alt={`Chế độ xem mở rộng của ${result.file.name}`} className="max-w-full h-auto" />
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border-2 border-muted">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              Tổng số hình ảnh: <span className="font-semibold text-foreground">{results.length}</span>
            </span>
            <span className="text-muted-foreground font-medium">
              Đã xử lý thành công:{" "}
              <span className="font-semibold text-primary">
                {results.filter((r) => !r.isLoading && !r.error && r.extractedIngredients.length > 0).length}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
