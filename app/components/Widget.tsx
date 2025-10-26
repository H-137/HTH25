"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WidgetProps {
  title?: string;
  children: React.ReactNode;
  modalChildren?: React.ReactNode;
}

export default function Widget({
  title,
  children,
  modalChildren,
}: WidgetProps) {
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Normal widget */}
      <motion.div
        layout
        ref={containerRef}
        className="flex flex-col p-4 rounded border border-gray-200 shadow-xl bg-white cursor-pointer overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
        onClick={() => !showModal && setShowModal(true)}
      >
        {title && (
          <h1 className="text-xl font-semibold mb-2 text-center">{title}</h1>
        )}
        {children}
      </motion.div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-40 bg-gray-100 bg-opacity-30 backdrop-blur-sm flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            {/* Expanded widget */}
            <motion.div
              layout
              className="bg-white rounded-lg p-6 shadow-2xl overflow-auto w-full max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
              {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
              {children}
              {modalChildren && <div className="mt-4">{modalChildren}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
