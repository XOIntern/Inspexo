"use client"

import * as React from "react"
import {
  createPaginatedRowModel,
  createSortedRowModel,
  createColumnHelper,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  EllipsisVerticalIcon,
  SearchIcon,
} from "lucide-react"

import { UserDialog } from "./user-dialog"
import { setUserStatus } from "./actions"
import {
  roleLabels,
  statusLabels,
  USER_ROLES,
  USER_STATUSES,
  type UserRow,
} from "./users-data"

const features = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, UserRow>()

const roleVariant: Record<UserRow["role"], string> = {
  admin: "bg-primary/15 text-primary",
  hse_manager: "bg-info/15 text-info",
  hse_officer: "bg-secondary text-secondary-foreground",
  viewer: "bg-accent text-accent-foreground",
}
const statusVariant: Record<UserRow["status"], string> = {
  active: "bg-success/15 text-success",
  inactive: "bg-secondary text-secondary-foreground",
  suspended: "bg-destructive/15 text-destructive",
}

function RowActions({ user }: { user: UserRow }) {
  const isActive = user.status === "active"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-open:bg-muted"
            size="icon"
          />
        }
      >
        <EllipsisVerticalIcon />
        <span className="sr-only">Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <UserDialog user={user} triggerLabel="Edit" asMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            setUserStatus({
              id: user.id,
              status: isActive ? "inactive" : "active",
            })
          }
        >
          {isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <UserDialog
        user={row.original}
        triggerLabel={row.original.name}
      />
    ),
  }),
  columnHelper.accessor("email", {
    header: "Email",
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="outline" className={`px-1.5 ${roleVariant[row.original.role]}`}>
        {roleLabels[row.original.role]}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className={`px-1.5 ${statusVariant[row.original.status]}`}>
        {statusLabels[row.original.status]}
      </Badge>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: () => <div className="w-full text-right">Created</div>,
    cell: ({ row }) => (
      <div className="w-full text-right tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    ),
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => <RowActions user={row.original} />,
  }),
])

function matchesSearch(user: UserRow, term: string): boolean {
  const t = term.toLowerCase()
  return user.name.toLowerCase().includes(t) || user.email.toLowerCase().includes(t)
}

export function UserTable({ data: initialData }: { data: UserRow[] }) {
  const [data] = React.useState(() => initialData)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const filtered = React.useMemo(() => {
    return data
      .filter((u) => (search ? matchesSearch(u, search) : true))
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => (statusFilter === "all" ? true : u.status === statusFilter))
  }, [data, search, roleFilter, statusFilter])

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: { sorting, pagination },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  })

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>
          <Select
            items={["all", ...USER_ROLES].map((r) => ({
              label: r === "all" ? "All roles" : roleLabels[r as UserRow["role"]],
              value: r,
            }))}
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(String(v))}
          >
            <SelectTrigger className="w-40" aria-label="Filter role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {["all", ...USER_ROLES].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "all" ? "All roles" : roleLabels[r as UserRow["role"]]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={["all", ...USER_STATUSES].map((s) => ({
              label: s === "all" ? "All statuses" : statusLabels[s as UserRow["status"]],
              value: s,
            }))}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(String(v))}
          >
            <SelectTrigger className="w-40" aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {["all", ...USER_STATUSES].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : statusLabels[s as UserRow["status"]]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <UserDialog triggerLabel="Add user" triggerVariant="outline" />
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-1">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {filtered.length} user(s)
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
