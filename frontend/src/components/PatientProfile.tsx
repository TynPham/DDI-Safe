import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useAuthStore, { type DrugInCabinet } from "@/stores/use-auth-store";
// Không cần import drugInteractionAPI nữa vì chỉ dùng API list
import { User, LogOut, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Không cần interface này nữa vì dùng trực tiếp từ DrugInCabinet

export function PatientProfile() {
  const { user, logout, updateProfile, fetchMedicineCabinet, removeDrugFromCabinet, addToMedicineCabinet } = useAuthStore();
  const [isLoadingCabinet, setIsLoadingCabinet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCabinet, setIsEditingCabinet] = useState(false);
  const [newMedication, setNewMedication] = useState("");
  // Không cần state riêng cho interactions nữa, dùng trực tiếp từ user.personalMedicineCabinet

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateOfBirth: user?.dateOfBirth || "",
    gender: user?.gender || "",
    address: user?.address || "",
  });

  const [cabinetData, setCabinetData] = useState<DrugInCabinet[]>(() => {
    const drugs = user?.personalMedicineCabinet || [];
    return Array.isArray(drugs) ? drugs.map((d) => (typeof d === "string" ? { drug_name: d } : d)) : [];
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "",
        address: user.address || "",
      });
      const drugs = user.personalMedicineCabinet || [];
      setCabinetData(Array.isArray(drugs) ? drugs.map((d) => (typeof d === "string" ? { drug_name: d } : d)) : []);
    }
  }, [user]);

  // Fetch medicine cabinet when user changes (only once)
  useEffect(() => {
    if (user?.id) {
      fetchMedicineCabinet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Check if a drug has actual interactions (not just "no interaction" messages)
  const hasActualInteractions = (interactions?: string): boolean => {
    if (!interactions || interactions.trim().length === 0) return false;

    // Parse interactions and check if any are real interactions
    const pairs = parseInteractions(interactions);
    return pairs.length > 0;
  };

  // Parse interactions string to extract drug pairs, filtering out "no interaction" ones
  const parseInteractions = (interactions: string): Array<{ drug1: string; drug2: string; details: string }> => {
    const pairs: Array<{ drug1: string; drug2: string; details: string }> = [];
    const parts = interactions
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    parts.forEach((part) => {
      // Try to extract drug names from interaction text
      // Pattern: "Tương tác giữa X và Y: ..."
      const match = part.match(/Tương tác giữa\s+([^và]+?)\s+và\s+([^:]+?):\s*(.+)/i);
      if (match) {
        const drug1 = match[1].trim();
        const drug2 = match[2].trim();
        const details = match[3].trim();

        // Filter out interactions that indicate "no interaction"
        const lowerDetails = details.toLowerCase();
        const isNoInteraction =
          lowerDetails.includes("không có tương tác") ||
          lowerDetails.includes("không tìm thấy tương tác") ||
          lowerDetails.includes("không có tương tác nào");

        if (!isNoInteraction) {
          pairs.push({ drug1, drug2, details });
        }
      }
    });

    return pairs;
  };

  // Normalize drug name for comparison (lowercase, trim)
  const normalizeDrugName = (name: string): string => {
    return name.toLowerCase().trim();
  };

  // Check if two drug names match (case-insensitive)
  const drugNamesMatch = (name1: string, name2: string): boolean => {
    return normalizeDrugName(name1) === normalizeDrugName(name2);
  };

  // Get all interaction pairs grouped by drug
  const getGroupedInteractions = (): Record<string, Array<{ drug2: string; details: string }>> => {
    if (!user?.personalMedicineCabinet) return {};

    const grouped: Record<string, Array<{ drug2: string; details: string }>> = {};

    user.personalMedicineCabinet.forEach((drug) => {
      const drugObj = typeof drug === "string" ? { drug_name: drug } : drug;
      if (drugObj.interactions) {
        // Parse and filter interactions - parseInteractions already filters out "no interaction" ones
        const pairs = parseInteractions(drugObj.interactions);

        // Only add to grouped if there are actual interactions
        if (pairs.length > 0) {
          pairs.forEach((pair) => {
            // Use the source drug as the key
            if (!grouped[drugObj.drug_name]) {
              grouped[drugObj.drug_name] = [];
            }

            // Find the other drug (not the source) - use case-insensitive matching
            let otherDrug: string;
            if (drugNamesMatch(pair.drug1, drugObj.drug_name)) {
              otherDrug = pair.drug2;
            } else if (drugNamesMatch(pair.drug2, drugObj.drug_name)) {
              otherDrug = pair.drug1;
            } else {
              // If neither matches exactly, check if one is a partial match or use the first one
              // This handles cases where drug names might have slight variations
              otherDrug = drugNamesMatch(pair.drug1, drugObj.drug_name) ? pair.drug2 : pair.drug1;
            }

            // Only add if we found a valid other drug
            if (otherDrug) {
              grouped[drugObj.drug_name].push({ drug2: otherDrug, details: pair.details });
            }
          });
        }
      }
    });

    return grouped;
  };

  const handleSave = () => {
    updateProfile({
      ...formData,
      gender: formData.gender as "male" | "female" | "other" | undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      dateOfBirth: user?.dateOfBirth || "",
      gender: user?.gender || "",
      address: user?.address || "",
    });
    setIsEditing(false);
  };

  const handleSaveCabinet = async () => {
    setIsLoadingCabinet(true);
    try {
      // Get current drugs from user
      const currentDrugs = user?.personalMedicineCabinet || [];
      const currentDrugNames = currentDrugs.map((d) => (typeof d === "string" ? d : d.drug_name));
      const newDrugNames = cabinetData.map((d) => d.drug_name);

      const newDrugs = newDrugNames.filter((drug) => !currentDrugNames.includes(drug));
      const removedDrugs = currentDrugNames.filter((drug) => !newDrugNames.includes(drug));

      // Remove drugs that were deleted
      for (const drug of removedDrugs) {
        try {
          await removeDrugFromCabinet(drug);
        } catch (error) {
          console.error(`Error removing drug ${drug}:`, error);
        }
      }

      // Add new drugs
      if (newDrugs.length > 0) {
        await addToMedicineCabinet(newDrugs);
      }

      // Refresh from API
      await fetchMedicineCabinet();
      setIsEditingCabinet(false);
      toast.success("Đã cập nhật tủ thuốc thành công!");
    } catch (error) {
      console.error("Error saving medicine cabinet:", error);
      toast.error("Có lỗi xảy ra khi cập nhật tủ thuốc");
    } finally {
      setIsLoadingCabinet(false);
    }
  };

  const handleCancelCabinet = () => {
    const drugs = user?.personalMedicineCabinet || [];
    setCabinetData(Array.isArray(drugs) ? drugs.map((d) => (typeof d === "string" ? { drug_name: d } : d)) : []);
    setIsEditingCabinet(false);
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setCabinetData([...cabinetData, { drug_name: newMedication.trim() }]);
      setNewMedication("");
    }
  };

  const removeMedication = (index: number) => {
    setCabinetData(cabinetData.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px] mx-auto">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Vui lòng đăng nhập để xem tủ thuốc</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-5xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Tủ Thuốc Cá Nhân</CardTitle>
              <CardDescription>Quản lý thông tin cá nhân và tủ thuốc của bạn</CardDescription>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng Xuất
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Thông Tin Cá Nhân</TabsTrigger>
              <TabsTrigger value="cabinet">Tủ Thuốc Cá Nhân</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ và Tên</Label>
                  {isEditing ? (
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  ) : (
                    <p className="text-sm font-medium">{user.name || "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  ) : (
                    <p className="text-sm font-medium">{user.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số Điện Thoại</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0123456789"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user.phone || "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày Sinh</Label>
                  {isEditing ? (
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Giới Tính</Label>
                  {isEditing ? (
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value as any })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">
                      {user.gender === "male" ? "Nam" : user.gender === "female" ? "Nữ" : user.gender === "other" ? "Khác" : "Chưa cập nhật"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa Chỉ</Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Nhập địa chỉ của bạn"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm font-medium">{user.address || "Chưa cập nhật"}</p>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave}>Lưu Thay Đổi</Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Hủy
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>Chỉnh Sửa Hồ Sơ</Button>
                )}
              </div>
            </TabsContent>

            {/* Medicine Cabinet Tab */}
            <TabsContent value="cabinet" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tủ Thuốc Cá Nhân</Label>
                  <p className="text-sm text-muted-foreground">
                    Danh sách hoạt chất thuốc bạn đã sử dụng. Bạn có thể tự nhập hoặc lưu từ kết quả kiểm tra tương tác.
                  </p>
                </div>

                {isEditingCabinet ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        placeholder="Nhập tên thuốc"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                      />
                      <Button type="button" size="icon" onClick={addMedication}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cabinetData.map((med, index) => {
                        const drugObj = typeof med === "string" ? { drug_name: med } : med;
                        const hasInteractions = hasActualInteractions(drugObj.interactions);
                        return (
                          <Badge
                            key={index}
                            variant={hasInteractions ? "destructive" : "secondary"}
                            className={`flex items-center gap-1 ${hasInteractions ? "bg-destructive text-destructive-foreground" : ""}`}
                          >
                            {drugObj.drug_name}
                            {hasInteractions && <AlertTriangle className="h-3 w-3" />}
                            <button type="button" onClick={() => removeMedication(index)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCabinet} disabled={isLoadingCabinet}>
                        {isLoadingCabinet ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          "Lưu Thay Đổi"
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelCabinet} disabled={isLoadingCabinet}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.personalMedicineCabinet && user.personalMedicineCabinet.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.personalMedicineCabinet.map((med, index) => {
                          const drugName = typeof med === "string" ? med : med.drug_name;
                          const interactions = typeof med === "string" ? undefined : med.interactions;
                          const hasInteractions = hasActualInteractions(interactions);
                          return (
                            <Badge
                              key={index}
                              variant={hasInteractions ? "destructive" : "secondary"}
                              className={`text-sm px-3 py-1.5 ${hasInteractions ? "bg-destructive text-destructive-foreground" : ""}`}
                            >
                              {drugName}
                              {hasInteractions && <AlertTriangle className="h-3 w-3 ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <p>Chưa có thuốc nào trong tủ thuốc</p>
                        <p className="text-sm mt-2">Thêm thuốc bằng cách nhập thủ công hoặc lưu từ kết quả kiểm tra tương tác</p>
                      </div>
                    )}
                    <Button onClick={() => setIsEditingCabinet(true)}>Chỉnh Sửa Tủ Thuốc</Button>
                  </div>
                )}

                {/* Interactions Table */}
                {(() => {
                  const groupedInteractions = getGroupedInteractions();
                  const hasInteractions = Object.keys(groupedInteractions).length > 0;

                  return hasInteractions ? (
                    <div className="space-y-4 mt-6 pt-6 border-t">
                      <div className="space-y-2">
                        <Label>Tương Tác Giữa Các Thuốc</Label>
                        <p className="text-sm text-muted-foreground">Bảng tương tác giữa các cặp thuốc trong tủ thuốc của bạn</p>
                      </div>

                      <div className="space-y-4">
                        {Object.entries(groupedInteractions).map(([drug, interactions]) => (
                          <Card key={drug} className="border-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                {drug}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Thuốc Tương Tác</TableHead>
                                      <TableHead>Chi Tiết</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {interactions.map((interaction, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell className="font-medium">{interaction.drug2}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{interaction.details}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
