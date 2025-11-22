import { Pill, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useAuthStore from "@/stores/use-auth-store";

interface AppSidebarProps {
  currentPage: "interaction" | "profile";
  onPageChange: (page: "interaction" | "profile") => void;
}

export function AppSidebar({ currentPage, onPageChange }: AppSidebarProps) {
  const { user } = useAuthStore();

  const menuItems = [
    {
      title: "Kiểm Tra Tương Tác",
      icon: Pill,
      page: "interaction" as const,
    },
    {
      title: "Tủ Thuốc Cá Nhân",
      icon: User,
      page: "profile" as const,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-2">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">DDI Safe</h2>
            {user && <p className="text-xs text-muted-foreground">{user.email}</p>}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={() => onPageChange(item.page)} isActive={currentPage === item.page}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
