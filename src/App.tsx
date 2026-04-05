import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ChatRoute from "./pages/ChatRoute";
import TimetablePage from "./pages/TimetablePage";
import DeadlinesPage from "./pages/DeadlinesPage";
import ResourcesPage from "./pages/ResourcesPage";
import StudyGroupsPage from "./pages/StudyGroupsPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import NotFound from "./pages/NotFound";
...
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/groups" element={<StudyGroupsPage />} />
            <Route path="/profile" element={<ProfileSettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
