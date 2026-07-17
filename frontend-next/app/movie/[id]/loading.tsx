"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-12 flex flex-col items-center mx-auto"
    >
      {/* Hero Backdrop Skeleton */}
      <div className="w-full h-[60vh] skeleton relative border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/40 to-transparent" />
      </div>
      
      {/* Content Skeleton */}
      <div className="w-full relative z-20 mx-auto max-w-7xl px-5 sm:px-8 md:px-12 -mt-48 md:-mt-64 flex flex-col lg:flex-row gap-10">
         {/* Poster */}
         <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1 }}
           className="w-full lg:w-72 aspect-[2/3] skeleton rounded-xl md:rounded-2xl shadow-poster border border-[var(--border-default)] shrink-0" 
         />
         
         {/* Details */}
         <div className="flex-1 pt-4 lg:pt-12 space-y-6">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="h-12 md:h-16 w-3/4 skeleton rounded-lg" 
            />
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4 flex-wrap"
            >
              <div className="h-8 w-20 skeleton rounded-full" />
              <div className="h-8 w-24 skeleton rounded-full" />
              <div className="h-8 w-16 skeleton rounded-full" />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-4 md:pt-8"
            >
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-[90%] skeleton rounded" />
              <div className="h-5 w-[75%] skeleton rounded" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-4 pt-6"
            >
              <div className="h-12 w-32 skeleton rounded-xl" />
              <div className="h-12 w-12 skeleton rounded-xl" />
              <div className="h-12 w-12 skeleton rounded-xl" />
            </motion.div>
         </div>
      </div>
    </motion.div>
  );
}
