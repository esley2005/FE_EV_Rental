"use client";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <motion.footer
      className="bg-white text-center py-4 shadow-inner text-blue-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      © 2025 <span className="font-semibold">EV Rent (GROUP 5 SWP391)</span>. All rights reserved.
    </motion.footer>
  );
}
