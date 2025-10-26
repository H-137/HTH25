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
  const [location, setLocation] = useState<{
    lat: number;
    long: number;
  } | null>(null);

  return (
    <motion.div
      layout
      className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden"
      transition={{ duration: 0.6 }}
    >
      {/* HEADER */}
      <motion.h1
        layout
        className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-3 text-center"
        transition={{ duration: 0.6 }}
      >
        Climate Delta
      </motion.h1>

      {/* SUBTITLE */}
      <motion.h2
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-lg md:text-xl text-gray-600 mb-8 text-center"
      >
        Learn about climate change in your city
      </motion.h2>

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
                <>
                  <img src="/stats.png" alt="Yale Climate Survey Data" />
                  <a href="https://climatecommunication.yale.edu/visualizations-data/ycom-us/">
                    Source: Yale Program on Climate Change Communication
                  </a>
                </>
              }
            >
              <h1 className="font-bold text-3xl bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-center text-transparent">
                Background
              </h1>
              <p className="mt-3 text-gray-700 text-justify">
                While most people in the United States agree that global warming
                is occurring and will harm future generations, many feel
                detached from the actual effects. Furthermore, a strong majority
                of Americans report that they rarely or never discuss global
                warming, and most hear about it in the media less than once a
                month. The goal of Climate Delta is to increase Americans’
                awareness of how global warming is unfolding at the local level
                and to empower them to take meaningful action today.
              </p>
              <h1 className="text-lg font-bold text-center mt-4">
                Authors: Matthew Leopold, Indel Garcia, Alex Lehman, Brendan
                Reiners
              </h1>
            </Widget>

            {/* Temperature Trends */}
            <div className="min-h-[350px]">
              <Widget
                modalChildren={
                  <>
                    <h2 className="font-bold text-xl mt-4">Data</h2>
                    Our graph uses local historical temperature records from the
                    National Oceanic and Atmospheric Administration (NOAA),
                    accessed via the Open-Meteo API.
                    <h2 className="font-bold text-xl mt-4">Analysis</h2>
                    An 11-year moving average is applied to smooth short-term
                    fluctuations and highlight long-term trends. This window
                    length corresponds to the typical 11-year solar activity
                    cycle, helping to reduce variability linked to
                    sunspot-related climate influences.
                    <h2 className="font-bold text-xl mt-4">Machine Learning</h2>
                    A Gated Recurrent Unit (GRU) neural network was trained on
                    historical NOAA temperature datasets to forecast future
                    temperature trends. For localized predictions, the model
                    uses average temperature inputs to project conditions 25
                    years into the future.
                  </>
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
                    Satellite data are sourced from Landsat 5 and Landsat 8,
                    composited to provide continuous coverage from 1984 to 2025.
                    Using Google Earth Engine, imagery was aggregated by
                    extracting a 10 km × 10 km region centered on the latitude
                    and longitude corresponding to each local city. For
                    consistency, images were selected between June 19th and
                    August 30th of each year, ensuring similar seasonal
                    conditions and filtering for low cloud cover. At most, one
                    image per year was used to represent each location.
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
            <div>
              <Widget>
                <Storm
                  key={`${location.lat}-${location.long}`}
                  location={location}
                />
              </Widget>
            </div>

            {/* Climate Facts */}
            <Facts location={location} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
