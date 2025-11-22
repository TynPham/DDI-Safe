import { AlertTriangle, CheckCircle, Info, ExternalLink } from "lucide-react";
import { Alert, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatbotInline from "./chatbot-inline";
import { useEffect } from "react";
import useGlobalStore from "@/stores/use-global-store";

interface DrugReference {
  name: string;
  link: string;
}

interface DrugConversion {
  original: string;
  converted: string;
  reference?: DrugReference;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  details: string;
  hasInteraction: boolean;
  reference1?: DrugReference;
  reference2?: DrugReference;
}

interface ParsedResult {
  drug_conversion?: DrugConversion[];
  interactions?: Array<{
    drug1: string;
    drug2: string;
    status: string;
    details: string;
    reference1?: DrugReference;
    reference2?: DrugReference;
  }>;
  summary?: {
    overall_risk?: string;
    major_interactions?: string[];
    recommendations?: string[];
  };
}

interface ResponseData {
  answer?: string;
  parsed_result?: ParsedResult;
  drug_links?: Record<string, string>;
}

interface InteractionResultsProps {
  result: string | ResponseData;
  isLoading: boolean;
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
  // Hooks must be called before any early returns
  const { openChatbot } = useGlobalStore();

  // Parse data first (even if we might return early)
  let drugConversions: DrugConversion[] = [];
  let drugInteractions: DrugInteraction[] = [];
  let summary: string = "";
  let parsedSummary: ParsedResult["summary"] | undefined = undefined;
  let answerText: string = "";

  if (result) {
    if (typeof result === "string") {
      // Old format: parse markdown string
      answerText = result;
      drugConversions = parseDrugConversions(result);
      drugInteractions = parseDrugInteractions(result);
      summary = extractSummary(result);
    } else {
      // New format: use parsed_result if available, fallback to parsing answer
      answerText = result.answer || "";
      if (result.parsed_result) {
        // Use parsed data
        drugConversions = result.parsed_result.drug_conversion || [];
        if (result.parsed_result.interactions) {
          drugInteractions = result.parsed_result.interactions.map((interaction) => ({
            drug1: interaction.drug1,
            drug2: interaction.drug2,
            details: interaction.details,
            hasInteraction: interaction.status === "Có Tương Tác",
            reference1: interaction.reference1,
            reference2: interaction.reference2,
          }));
        }
        parsedSummary = result.parsed_result.summary;
        // Generate summary text from structured data
        if (parsedSummary) {
          summary = `**Rủi Ro Tổng Thể:** ${parsedSummary.overall_risk || "Không xác định"}\n\n`;
          if (parsedSummary.major_interactions && parsedSummary.major_interactions.length > 0) {
            summary += "**Các Tương Tác Chính:**\n";
            parsedSummary.major_interactions.forEach((interaction) => {
              summary += `- ${interaction}\n`;
            });
            summary += "\n";
          }
          if (parsedSummary.recommendations && parsedSummary.recommendations.length > 0) {
            summary += "**Khuyến Nghị Lâm Sàng:**\n";
            parsedSummary.recommendations.forEach((rec) => {
              summary += `- ${rec}\n`;
            });
          }
        }
      } else if (answerText) {
        // Fallback to parsing markdown
        drugConversions = parseDrugConversions(answerText);
        drugInteractions = parseDrugInteractions(answerText);
        summary = extractSummary(answerText);
      }
    }
  }

  // Auto-open chatbot when results are available
  useEffect(() => {
    const hasResults = drugInteractions.length > 0 || summary.length > 0 || drugConversions.length > 0;
    if (hasResults && !isLoading) {
      openChatbot();
    }
  }, [drugInteractions.length, summary.length, drugConversions.length, isLoading, openChatbot]);

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

  // Determine severity based on parsed interactions
  // Priority: parsed interactions > parsed summary > text keywords (only if no parsed data)
  const hasAnyInteraction = drugInteractions.some((interaction) => interaction.hasInteraction);

  // Check risk level in parsed summary first (most reliable)
  let hasRisk = false;
  if (parsedSummary?.overall_risk) {
    const riskLevel = parsedSummary.overall_risk.toLowerCase();
    hasRisk = !["không có", "thấp", "không xác định"].some((safe) => riskLevel.includes(safe));
  } else if (summary) {
    // Fallback to parsing summary text only if no parsed summary
    const lowerSummary = summary.toLowerCase();
    hasRisk =
      lowerSummary.includes("rủi ro tổng thể") &&
      !lowerSummary.includes("rủi ro tổng thể: không có") &&
      !lowerSummary.includes("rủi ro tổng thể: thấp");
  }

  // Only check warning keywords if we DON'T have parsed data (fallback for old format)
  // This prevents false positives from keywords when we have reliable parsed data
  let hasWarningKeywords = false;
  const hasParsedData = typeof result !== "string" && result.parsed_result;
  if (!hasParsedData && drugInteractions.length > 0) {
    const lowerAnswerText = answerText.toLowerCase();
    hasWarningKeywords =
      lowerAnswerText.includes("nghiêm trọng") ||
      lowerAnswerText.includes("nguy hiểm") ||
      lowerAnswerText.includes("chống chỉ định") ||
      lowerAnswerText.includes("chảy máu") ||
      lowerAnswerText.includes("độc tính");
  }

  // Severity: prioritize actual parsed interactions
  // If no interactions in table, always show safe (regardless of risk level in summary)
  // Risk level in summary should only be used as additional context when there ARE interactions
  // This ensures consistency: if table shows "An Toàn" for all pairs, header should also be safe
  const severity: "info" | "warning" | "safe" = hasAnyInteraction || (hasRisk && hasAnyInteraction) || hasWarningKeywords ? "warning" : "safe";

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
      <Alert
        variant={severity === "warning" ? "destructive" : "default"}
        className={
          severity === "safe"
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            : severity === "warning"
            ? undefined
            : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        }
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold mb-2">{getTitle()}</AlertTitle>
          </div>
        </div>
      </Alert>

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
                    <TableCell className="font-medium">
                      {conv.original}
                      {conv.reference?.link && (
                        <a
                          href={conv.reference.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
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
                      <TableCell className="font-medium whitespace-normal">
                        {interaction.drug1}
                        {interaction.reference1?.link && (
                          <a
                            href={interaction.reference1.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-normal">
                        {interaction.drug2}
                        {interaction.reference2?.link && (
                          <a
                            href={interaction.reference2.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
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

      {/* Chatbot Inline - Show below results */}
      <ChatbotInline />

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
                {answerText}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
