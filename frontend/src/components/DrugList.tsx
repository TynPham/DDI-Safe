import { X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface DrugListProps {
  drugs: string[];
  onRemoveDrug: (drug: string) => void;
  onAddDrug: (drug: string) => void;
}

export function DrugList({ drugs, onRemoveDrug }: DrugListProps) {
  if (drugs.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 shadow-lg mt-4">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <CardTitle className="text-xl font-bold">Thành Phần Hoạt Chất Đã Phát Hiện</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          {drugs.map((drug, index) => (
            <Badge
              key={`${drug}-${index}`}
              variant="secondary"
              className="text-sm px-4 py-2 flex items-center gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors duration-200 font-medium shadow-sm"
            >
              {drug}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-primary/20 rounded-full transition-colors duration-200"
                onClick={() => onRemoveDrug(drug)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 font-medium">
          Đã phát hiện <span className="font-semibold text-primary">{drugs.length}</span> hoạt chất. Xóa những hoạt chất không chính xác.
        </p>
      </CardContent>
    </Card>
  );
}
