"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface LapPoint {
  lapNumber: number;
  lapTimeMs: number;
}

/**
 * Section 4: lap-time progression across the season, styled to match the
 * design system rather than left at library defaults. Only rendered when
 * there's a real race's worth of laps — see the caller for the density
 * gate (never an empty chart with axes and no line, section 1).
 */
export function TelemetryChart({ laps, classMedianMs }: { laps: LapPoint[]; classMedianMs: number | null }) {
  if (laps.length < 3) return null;

  const data = laps.map((l) => ({ lap: l.lapNumber, seconds: l.lapTimeMs / 1000 }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="lap" tick={{ fontSize: 11, fill: "#B8B5AE" }} tickLine={false} axisLine={{ stroke: "#E6E4DF" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#B8B5AE" }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E6E4DF", fontSize: 12 }}
            formatter={(value) => [`${Number(value).toFixed(3)}s`, "Lap time"]}
          />
          {classMedianMs != null && (
            <ReferenceLine y={classMedianMs / 1000} stroke="#B8B5AE" strokeDasharray="4 4" label={{ value: "class median", fontSize: 10, fill: "#B8B5AE" }} />
          )}
          <Line type="monotone" dataKey="seconds" stroke="#C8102E" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
