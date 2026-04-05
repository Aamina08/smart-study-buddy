import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Brain, LayoutDashboard, MessageSquare, Calendar, ClipboardList, BookOpen, Users, Settings, LogOut } from "lucide-react";
...
          <NavLink to="/resources" icon={<BookOpen className="h-4 w-4" />}>Resources</NavLink>
          <NavLink to="/groups" icon={<Users className="h-4 w-4" />}>Study Groups</NavLink>
          <NavLink to="/profile" icon={<Settings className="h-4 w-4" />}>Profile</NavLink>
        </nav>
...
          <NavLink to="/resources" icon={<BookOpen className="h-4 w-4" />} mobile>Resources</NavLink>
          <NavLink to="/groups" icon={<Users className="h-4 w-4" />} mobile>Groups</NavLink>
          <NavLink to="/profile" icon={<Settings className="h-4 w-4" />} mobile>Profile</NavLink>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:overflow-auto mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}
