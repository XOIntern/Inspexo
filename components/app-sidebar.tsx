"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavSites } from "@/components/nav-sites"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  TriangleAlertIcon,
  WrenchIcon,
  FileTextIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  ShieldCheckIcon,
} from "lucide-react"

export type SidebarUser = {
  name: string
  email: string
  avatar: string
}

export type SidebarSite = {
  name: string
  url: string
}

export type SidebarNavItem = {
  title: string
  url: string
  icon: React.ReactNode
  roles?: string[]
}

const defaultUser: SidebarUser = {
  name: "Rudi Hartono",
  email: "rudi@inspexo.id",
  avatar: "",
}

const data = {
  user: defaultUser,
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Audits",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Findings",
      url: "#",
      icon: <TriangleAlertIcon />,
    },
    {
      title: "Corrective Actions",
      url: "#",
      icon: <WrenchIcon />,
    },
    {
      title: "Reports",
      url: "#",
      icon: <FileTextIcon />,
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: <UsersIcon />,
      roles: ["admin"],
    },
    {
      title: "Administration",
      url: "/admin",
      icon: <ShieldCheckIcon />,
      roles: ["admin"],
    },
  ] as SidebarNavItem[],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
  sites: [
    {
      name: "Plant 1",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      name: "Plant 2",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      name: "Plant 3",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      name: "Warehouse 1",
      url: "#",
      icon: <ClipboardListIcon />,
    },
  ],
}
export function AppSidebar({
  user,
  sites,
  role,
  navMain: navMainOverride,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: SidebarUser
  sites?: SidebarSite[]
  role?: string
  navMain?: SidebarNavItem[]
}) {
  // Active-state mengikuti URL, bukan hardcode per item.
  const pathname = usePathname()
  const resolvedUser = user ?? data.user
  const resolvedSites = (sites ?? data.sites).map((site) => ({
    ...site,
    icon: <ClipboardListIcon />,
  }))
  // UX-only filtering: the backend remains the authorization boundary.
  // Without a role (e.g. unauthenticated previews/tests) show everything.
  const navMain = (navMainOverride ?? data.navMain)
    .filter((item) => role === undefined || item.roles === undefined || item.roles.includes(role))
    .map((item) => ({
      ...item,
      isActive: item.url !== "#" && pathname === item.url,
    }))
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <Image
                src="/logoXO.webp"
                alt="InspeXO logo"
                width={88}
                height={47}
                className="h-auto w-9"
              />
              <span className="text-base font-semibold">InspeXO</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSites items={resolvedSites} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={resolvedUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
