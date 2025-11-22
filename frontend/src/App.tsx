import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { InteractionCheckPage } from "@/components/InteractionCheckPage";
import { PatientProfile } from "@/components/PatientProfile";
import { LoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/stores/use-auth-store";
import { LogIn } from "lucide-react";

function App() {
  const [currentPage, setCurrentPage] = useState<"interaction" | "profile">("interaction");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  return (
    <SidebarProvider>
      <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div></div>
            {!isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => setIsLoginOpen(true)}>
                <LogIn className="h-4 w-4 mr-2" />
                Đăng Nhập
              </Button>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6 ml-44">
          {currentPage === "interaction" ? <InteractionCheckPage /> : <PatientProfile />}
        </div>
      </SidebarInset>
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </SidebarProvider>
  );
}

export default App;
