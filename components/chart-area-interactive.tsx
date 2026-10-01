"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Open findings trend"

// ponytail: data statis; sambungkan ke query findings per bulan saat model DB siap.
const chartData = [
  { month: "Juli", findings: 14, closed: 9 },
  { month: "Agustus", findings: 12, closed: 8 },
  { month: "September", findings: 15, closed: 11 },
  { month: "Oktober", findings: 10, closed: 4 },
  { month: "November", findings: 8, closed: 5 },
  { month: "Desember", findings: 7, closed: 4 },
]

const chartConfig = {
  findings: {
    label: "Open findings",
    color: "var(--warning)",
  },
  closed: {
    label: "Closed",
    color: "var(--success)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [selectedRange, setSelectedRange] = React.useState<string | null>(null)
  // Di mobile toggle-nya tersembunyi; tampilkan rentang pendek secara default.
  const timeRange =
    isMobile && selectedRange === null ? "3m" : (selectedRange ?? "6m")

  const filteredData = chartData.slice(
    timeRange === "3m" ? -3 : timeRange === "1m" ? -1 : -6
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Open Findings Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Open vs closed findings for the last 6 months
          </span>
          <span className="@[540px]/card:hidden">Last 6 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[timeRange]}
            onValueChange={(value) => {
              setSelectedRange(value[0] ?? "6m")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="6m">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="3m">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="1m">This month</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 6 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="1m" className="rounded-lg">
                This month
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillFindings" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-findings)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-findings)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillClosed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-closed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-closed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="closed"
              type="natural"
              fill="url(#fillClosed)"
              stroke="var(--color-closed)"
              stackId="a"
            />
            <Area
              dataKey="findings"
              type="natural"
              fill="url(#fillFindings)"
              stroke="var(--color-findings)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
