"use client";

import dynamic from "next/dynamic";

const CinemaWorldMap = dynamic(() => import("./CinemaWorldMap"), { ssr: false });

export default function CinemaWorldMapWrapper() {
  return <CinemaWorldMap />;
}
