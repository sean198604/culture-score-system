import { useState } from "react";

export default function useDashboardStore() {
  const [timeType, setTimeType] = useState("year");
  const [orgType, setOrgType] = useState("user");
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(null);
  const [quarter, setQuarter] = useState(1);

  return {
    timeType,
    setTimeType,
    orgType,
    setOrgType,
    selectedId,
    setSelectedId,
    category,
    setCategory,
    year,
    setYear,
    month,
    setMonth,
    quarter,
    setQuarter,
  };
}
