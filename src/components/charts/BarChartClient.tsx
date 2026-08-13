"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";

// Registration is a module-eval side effect, so it must live in the same
// client-only chunk as the chart.js import — never in a module the server
// bundle can pull in.
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function BarChartClient({
  data,
  options,
}: {
  data: ChartData<"bar">;
  options: ChartOptions<"bar">;
}) {
  return <Bar data={data} options={options} />;
}
