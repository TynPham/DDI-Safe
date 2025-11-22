import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface InteractionResultsProps {
  result: string;
  isLoading: boolean;
}

interface DrugConversion {
  original: string;
  converted: string;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  details: string;
  hasInteraction: boolean;
}

// Parse drug name conversions from markdown
function parseDrugConversions(text: string): DrugConversion[] {
  const conversions: DrugConversion[] = [];
  const conversionSection = text.match(/### Chuyển Đổi Tên Thuốc\n([\s\S]*?)(?=\n###|$)/);

  if (conversionSection) {
    const lines = conversionSection[1].split("\n").filter((line) => line.trim().startsWith("-"));
    lines.forEach((line) => {
      // Match pattern: - Original → Converted1 → Converted2 (etc)
      const match = line.match(/- (.+?)( → .+)+$/);
      if (match) {
        const parts = line.replace(/^-\s*/, "").split(" → ");
        if (parts.length >= 2) {
          conversions.push({
            original: parts[0].trim(),
            converted: parts[parts.length - 1].trim(), // Take the last converted name
          });
        }
      }
    });
  }

  return conversions;
}

// Parse drug interactions from markdown
function parseDrugInteractions(text: string): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const interactionSection = text.match(/### Tương Tác Giữa Các Cặp Thuốc\n([\s\S]*?)(?=\n---|$)/);

  if (interactionSection) {
    const pairs = interactionSection[1].split(/\n#### /).filter((pair) => pair.trim());

    pairs.forEach((pair) => {
      // Match: Drug1 + Drug2 followed by newline
      const drugMatch = pair.match(/^(.+?)\s+\+\s+(.+?)(?:\n|$)/);
      if (drugMatch) {
        const drug1 = drugMatch[1].trim();
        const drug2 = drugMatch[2].trim();
        // Match: **Chi tiết tương tác:** or **Chi tiết Tương Tác:** (case insensitive) followed by details
        const detailsMatch = pair.match(/\*\*Chi tiết [Tt]ương [Tt]ác:\*\*\s*(.+?)(?=\n\n|\n#### |$)/s);
        const details = detailsMatch ? detailsMatch[1].trim() : "";

        // Determine if there's an interaction:
        // - If details is empty, assume no interaction (safe)
        // - If details contains phrases indicating no interaction, no interaction
        // - Otherwise, if there's actual content describing an interaction, there's an interaction
        const lowerDetails = details.toLowerCase();
        const noInteractionPhrases = [
          "không có tương tác nào được biết đến",
          "không tìm thấy tương tác",
          "không có tương tác",
          "không tìm thấy",
          "an toàn",
          "không có",
        ];

        const hasInteraction = details.length > 0 && !noInteractionPhrases.some((phrase) => lowerDetails.includes(phrase));

        interactions.push({
          drug1,
          drug2,
          details,
          hasInteraction,
        });
      }
    });
  }

  return interactions;
}

// Extract summary section
function extractSummary(text: string): string {
  const summaryMatch = text.match(/### Tóm Tắt Cuối Cùng\n([\s\S]*?)$/);
  return summaryMatch ? summaryMatch[1].trim() : "";
}

export function InteractionResults({ result, isLoading }: InteractionResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Đang Phân Tích Tương Tác...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Đang kiểm tra tương tác thuốc trong cơ sở dữ liệu...</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  // Parse the result first
  const drugConversions = parseDrugConversions(result);
  const drugInteractions = parseDrugInteractions(result);
  const summary = extractSummary(result);

  // Determine severity based on parsed interactions
  // If any interaction exists, show warning; otherwise safe
  const hasAnyInteraction = drugInteractions.some((interaction) => interaction.hasInteraction);

  // Also check summary for additional context
  const lowerResult = result.toLowerCase();
  const lowerSummary = summary.toLowerCase();

  // Check for warning keywords (excluding safe phrases)
  const hasWarningKeywords =
    lowerResult.includes("nghiêm trọng") ||
    lowerResult.includes("nguy hiểm") ||
    lowerResult.includes("chống chỉ định") ||
    lowerResult.includes("chảy máu") ||
    lowerResult.includes("độc tính");

  // Check risk level in summary - only warn if risk is medium or high
  const hasRisk =
    lowerSummary.includes("rủi ro tổng thể") &&
    !lowerSummary.includes("rủi ro tổng thể: không có") &&
    !lowerSummary.includes("rủi ro tổng thể: thấp");

  const severity: "info" | "warning" | "safe" = hasAnyInteraction || hasWarningKeywords || hasRisk ? "warning" : "safe";

  const getIcon = () => {
    switch (severity) {
      case "safe":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getTitle = () => {
    switch (severity) {
      case "safe":
        return "Không Tìm Thấy Tương Tác";
      case "warning":
        return "Cảnh Báo Tương Tác";
      default:
        return "Thông Tin Tương Tác";
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <Alert variant={severity === "warning" ? "destructive" : "default"}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold mb-2">{getTitle()}</AlertTitle>
          </div>
        </div>
      </Alert>

      {/* Drug Name Conversions Table */}
      {drugConversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chuyển Đổi Tên Thuốc</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Tên Gốc</TableHead>
                  <TableHead className="w-1/2">Tên Đã Chuyển Đổi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drugConversions.map((conv, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{conv.original}</TableCell>
                    <TableCell>{conv.converted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drug Interactions Table */}
      {drugInteractions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tương Tác Giữa Các Cặp Thuốc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Thuốc 1</TableHead>
                    <TableHead className="w-[20%]">Thuốc 2</TableHead>
                    <TableHead className="w-[15%]">Trạng Thái</TableHead>
                    <TableHead className="w-[45%]">Chi Tiết Tương Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drugInteractions.map((interaction, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium whitespace-normal">{interaction.drug1}</TableCell>
                      <TableCell className="font-medium whitespace-normal">{interaction.drug2}</TableCell>
                      <TableCell>
                        {interaction.hasInteraction ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">Có Tương Tác</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">An Toàn</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-normal">{interaction.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Section */}
      {summary && (
        <Card className="border-2 border-primary shadow-xl ring-2 ring-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/10">
          <CardHeader className="bg-gradient-to-r from-primary/15 to-transparent border-b-2 border-primary/30">
            <CardTitle className="text-lg font-semibold">Tóm Tắt Cuối Cùng</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="markdown-content text-base leading-relaxed font-medium">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0 text-foreground">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-2">{children}</ol>,
                  li: ({ children }) => <li className="text-base">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic my-3">{children}</blockquote>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback: If parsing fails, show original markdown */}
      {drugConversions.length === 0 && drugInteractions.length === 0 && !summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="markdown-content text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-4 italic my-2">{children}</blockquote>,
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
