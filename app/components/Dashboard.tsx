"use client";

import Graph from "./Graph";
import Widget from "./Widget";
import Search from "./Search";
import Gif from "./gif_slider";
import Storm from "./Storm";
import Facts from "./Facts";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(
    null
  );

  return (
    <motion.div
      layout
      className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden"
      transition={{ duration: 0.6 }}
    >
      {/* HEADER */}
      <motion.h1
        layout
        className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-8 text-center"
        transition={{ duration: 0.6 }}
      >
        Climate Delta
      </motion.h1>

      {/* SEARCH */}
      <motion.div
        layout
        transition={{ duration: 0.8, type: "spring" }}
        className={`w-full max-w-md mb-10 ${
          location ? "translate-y-0" : "translate-y-[30vh]"
        } transition-transform duration-700`}
      >
        <Search setLocation={setLocation} />
      </motion.div>

      {/* DASHBOARD CONTENT */}
      <AnimatePresence>
        {location && (
          <motion.div
            layout
            key="dashboard-content"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4"
          >
            {/* Background Widget */}
            <Widget
              modalChildren={
                <h1 className="text-lg font-bold text-center">
                  Authors: Matthew Leopold, Indel Garcia, Alex Lehman, Brendan
                  Reiners
                </h1>
              }
            >
              <h1 className="font-bold text-3xl bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-center text-transparent">
                Background
              </h1>
              <p className="mt-3 text-gray-700 text-justify">
                EXPLAIN WHAT CLIMATE DELTA IS AIMING TO DO, PROBLEM STATEMENT,
                MOTIVATION, ETC.
              </p>
            </Widget>

            {/* Temperature Trends */}
            <div className='h-[350px]'>
            <Widget
              modalChildren={
                <p>
                  EXPLAIN WHERE THE TEMP DATA IS BEING SOURCED FROM EXPLAIN HOW
                  THE MOVING AVERAGE WORKS AND WHY (SOLAR CYCLES) EXPLAIN THE AI
                  PREDICTION AND THE PARAMETERS THAT ARE USED
                </p>
              }
            >
              <h1 className="font-bold text-3xl bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-center text-transparent">
                Temperature Trends
              </h1>
              <Graph
                title="Yearly average temperature"
                average={true}
                coords={location ?? undefined}
              />
            </Widget>
            </div>

            {/* Satellite Timelapse */}
            <motion.div
              layout
              transition={{ duration: 1 }}
              className="lg:row-span-2"
            >
              <Widget
                modalChildren={
                  <p>
                    EXPLAIN WHERE THE SATELLITE IMAGES ARE FROM - LANDSAT 5 and
                    8. EXPLAIN HOW THE TIMELAPSE IS FORMED - COMPOSITION OF
                    IMAGES FROM THE INITIAL LAUNCH OF LANDSAT 5 TO THE MOST
                    RECENT IMAGES FROM LANDSAT 8 SOURCED FROM GOOGLE EARTH
                    ENGINE.
                  </p>
                }
              >
                <h1 className="font-bold text-3xl bg-gradient-to-r from-green-500 to-green-400 bg-clip-text text-center text-transparent">
                  Satellite Timelapse
                </h1>
                <Gif
                  key={`${location.lat}-${location.long}`}
                  lat={location.lat}
                  long={location.long}
                />
              </Widget>
            </motion.div>

            {/* Storm Events */}
            <Widget>
              <Storm
                key={`${location.lat}-${location.long}`}
                location={location}
              />
            </Widget>
            {/* Quick Facts */}
            <Facts location={location} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}