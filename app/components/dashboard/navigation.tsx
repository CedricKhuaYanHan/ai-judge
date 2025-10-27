/**
 * Unified navigation component for the dashboard sidebar
 * Combines main navigation, secondary navigation, and user navigation
 */

import { memo, useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { MoreVertical, LogOut, UserCircle, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

interface NavMainProps {
  items: NavItem[];
}

interface NavSecondaryProps {
  items: NavItem[];
  className?: string;
}

interface NavUserProps {
  user: {
    firstName: string;
    lastName: string;
    emailAddresses: Array<{ emailAddress: string }>;
    imageUrl: string | null;
  };
}

export const NavMain = memo(({ items }: NavMainProps) => {
  const location = useLocation();

  const navItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isActive: location.pathname === item.url,
      })),
    [items, location.pathname]
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                asChild
              >
                <Link to={item.url} prefetch="intent">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

export function NavSecondary({ items, className }: NavSecondaryProps) {
  const location = useLocation();

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              location.pathname === item.url ||
              (item.url.startsWith("/dashboard") &&
                location.pathname.startsWith(item.url));
            const isImplemented = item.url !== "#";

            return (
              <SidebarMenuItem key={item.title}>
                {isImplemented ? (
                  <SidebarMenuButton isActive={isActive} asChild>
                    <Link to={item.url} prefetch="intent">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton disabled>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const userFullName = user.firstName + " " + user.lastName;
  const userEmail = user.emailAddresses[0].emailAddress;
  const userInitials =
    (user?.firstName?.charAt(0) || "").toUpperCase() +
    (user?.lastName?.charAt(0) || "").toUpperCase();
  const userProfile = user.imageUrl;

  const handleSignOut = () => {
    alert("Sign out functionality is not available yet.");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={userProfile || undefined}
                  alt={userFullName}
                />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userFullName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {userEmail}
                </span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={userProfile || undefined}
                    alt={userFullName}
                  />
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userFullName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
