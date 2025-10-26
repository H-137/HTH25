"use client";

import Graph from "./Graph";
import Widget from "./Widget";
import Search from "./Search";
import Gif from "./gif_slider";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [location, setLocation] = useState<{
    lat: number;
    long: number;
  } | null>(null);

  return (
    <motion.div
      layout
      className={`h-screen flex flex-col items-center p-4 ${
        location ? "" : "pt-[40vh]"
      }`}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        layout
        className="mx-auto mb-4"
        transition={{ duration: 0.8 }}
      >
        <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Climate Delta
        </p>
      </motion.div>

      <motion.div
        layout
        className={`w-3/4 lg:w-1/3 md:w-1/2 mx-auto mb-4 transition-[width] duration-3000`}
        transition={{ duration: 0.8 }}
      >
        <Search setLocation={setLocation} />
      </motion.div>

      <motion.div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full duration-3000 ${
          location ? "opacity-100" : "opacity-0"
        }`}
        layout
        transition={{ duration: 0.8}}
      >
        <motion.div layout transition={{ duration: 2 }}>
          <Widget modalChildren={
            <h1 className="text-lg font-bold text-center">
                Authors: Matthew Leopold, Indel Garcia, Alex Lehman, Brendan Reiners
            </h1> 
          }>
            <h1 className="font-bold text-4xl bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-center text-transparent">
                Background
            </h1>
            <p className="mt-2 text-gray-700 text-justify">
                EXPLAIN WHAT CLIMATE DELTA IS AIMING TO DO, PROBLEM STATEMENT, MOTIVATION, ETC.
            </p>
          </Widget>
        </motion.div>
        <motion.div layout transition={{ duration: 1 }}>
          <Widget modalChildren={
            <p>
                EXPLAIN WHERE THE TEMP DATA IS BEING SOURCED FROM
                EXPLAIN HOW THE MOVING AVERAGE WORKS AND WHY (SOLAR CYCLES)
                EXPLAIN THE AI PREDICTION AND THE PARAMETERS THAT ARE USED
            </p>
          }>
            <h1 className="font-bold text-4xl bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-center text-transparent">
                Temperature Trends
            </h1>
            <Graph title="Yearly average temperature" average={true} coords={location ?? undefined}/>
          </Widget>
        </motion.div>
        <motion.div layout transition={{ duration: 0.8}}>
          <Widget modalChildren={
           <p>
                EXPLAIN WHERE THE SATELLITE IMAGES ARE FROM - LANDSAT 5 and 8
                EXPLAIN HOW THE TIMELAPSE IS FORMED - COMPOSITION OF IMAGES FROM THE INITIAL LAUNCH OF LANDSAT 5 TO THE MOST RECENT IMAGES FROM LANDSAT 8
                SOURCED FROM GOOGLE EARTH ENGINE
           </p> 
          }>
            <h1 className="font-bold text-4xl bg-gradient-to-r from-green-500 to-green-400 bg-clip-text text-center text-transparent">
                Satalite Timelapse
            </h1>
            <Gif
              key={
                location ? `${location.lat}-${location.long}` : "no-location"
              }
              lat={location?.lat ?? 0}
              long={location?.long ?? 0}
            />
          </Widget>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
