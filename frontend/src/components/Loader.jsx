import React from 'react';
import { motion } from 'framer-motion';

const Loader = () => {
  return (
    <div className="flex justify-center items-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-12 h-12 border-4 border-surface border-t-primary rounded-full"
      />
    </div>
  );
};

export default Loader;
