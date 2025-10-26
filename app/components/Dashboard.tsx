'use client';

import Graph from "./Graph";
import Widget from "./Widget";
import Search from "./Search";
import Gif from "./gif_slider";
import {useState, useEffect} from "react";
import { motion } from "framer-motion";

export default function Dashboard() {

    const [location, setLocation] = useState< {lat: number; long: number;} | null>(null);
    useEffect(() => {
        // setTimeout(() => {
        //     setLocation({ lat: 37.7749, long: -122.4194 }); // San Francisco coords
        // }, 500);
        console.log("Location set to San Francisco after delay");
        setTimeout(() => {
            setLocation({ lat: 42.3601, long: -71.0589 }); // Boston
        }, 500);
    }, []);

    return (
        <motion.div layout className={`h-screen flex flex-col items-center p-4 ${location ? "" : "pt-[40vh]"}`}>
            <motion.div layout className={`w-3/4 lg:w-1/3 md:w-1/2 mx-auto mb-4 transition-[width] duration-500`}>
                <Search setLocation={setLocation} />
            </motion.div>
            <motion.div className={`grid grid-cols-3 gap-4 w-full ${location ? "opacity-100" : "opacity-0"}`} layout>
                <motion.div layout className={` transition-opacity duration-500`}>
                    <Widget>
                        <Graph title="Global temperature trends" average={true} />
                    </Widget>
                </motion.div>
                <motion.div layout className={` transition-opacity duration-500`}>
                    <Widget>
                        <Gif key={location ? `${location.lat}-${location.long}` : "no-location"} lat={location?.lat ?? 0} long={location?.long ?? 0} />
                    </Widget>
                </motion.div>
                <motion.div layout className="">
                    <Widget>
                        <h1>test</h1>
                    </Widget>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}