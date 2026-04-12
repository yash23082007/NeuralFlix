"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MoodSelector } from "../../components/recommendation/MoodSelector";

export default function MoodPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20 page-enter">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <MoodSelector />
      </div>
    </main>
  );
}