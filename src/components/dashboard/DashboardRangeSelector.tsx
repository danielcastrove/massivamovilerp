"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGES: { value: string; label: string }[] = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
  { value: "36", label: "36 meses" },
  { value: "todo", label: "Todo el historial" },
];

interface Props {
  current: string;
}

export default function DashboardRangeSelector({ current }: Props) {
  const router = useRouter();

  return (
    <Select
      value={current}
      onValueChange={(value) => router.push(`/dashboard?rango=${value}`)}
    >
      <SelectTrigger className="w-[190px]" aria-label="Rango de las gráficas">
        <SelectValue placeholder="Rango" />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}