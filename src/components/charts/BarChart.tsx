"use client";

import dynamic from "next/dynamic";

// chart.js has a circular class hierarchy that Next's server bundler mis-orders
// (`class extends undefined` → setPrototypeOf crash during SSR). Loading it
// ssr:false keeps chart.js out of the server bundle entirely; the client render
// is fine. This wrapper carries NO static chart.js import, so importing it does
// not drag chart.js back into the server graph — that's why it's a separate
// file from BarChartClient.
export const BarChart = dynamic(() => import("./BarChartClient"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});
