import {
  Settings,
  FileText,
  Gavel,
  BarChart3,
  HelpCircle,
  Layers,
} from "lucide-react";
import { Link } from "react-router";
import { NavMain, NavSecondary, NavUser } from "./navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Submissions",
      url: "/dashboard/submissions",
      icon: FileText,
    },
    {
      title: "Questions",
      url: "/dashboard/questions",
      icon: HelpCircle,
    },
    {
      title: "Queues",
      url: "/dashboard/queues",
      icon: Layers,
    },
    {
      title: "Judges",
      url: "/dashboard/judges",
      icon: Gavel,
    },
    {
      title: "Results",
      url: "/dashboard/results",
      icon: BarChart3,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({
  variant,
  user,
}: {
  variant: "sidebar" | "floating" | "inset";
  user: any;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/" prefetch="viewport">
              <span className="text-base font-semibold">AI Judge</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
