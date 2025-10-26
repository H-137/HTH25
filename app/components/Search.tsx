"use client";

import { useState } from "react";

export default function Search({
  setLocation,
}: {
  setLocation: (location: { lat: number; long: number }) => void;
}) {
  const [city, setCity] = useState("");
  const [stateInit, setStateInit] = useState("");
  const [fetchedPlace, setFetchedPlace] = useState(""); // API result of city & state
  const [isClosestMatch, setIsClosestMatch] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; long: number } | null>(
    null
  ); // coords from API

  const US_STATE_BY_ABBR: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  };

  // convert the State_list to an array to build out: "California (CA)""
  const STATE_LIST = Object.entries(US_STATE_BY_ABBR).map(([abbr, name]) => ({
    abbr,
    name,
    label: `${name} (${abbr})`,
  }));

  // on submission of form...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // get rid of any leading or trailing white spaces
    if (!city.trim()) {
      console.log("Please enter a city");
      return;
    }

    try {
      const query = new URLSearchParams({ city: city.trim() });
      // uncomment this line if we want to add state in the query, I dont agree with using it -Indel
      // if (stateInit.trim()) query.set("state", stateInit.trim().toUpperCase())

      // call and retrieve api call
      const res = await fetch(`/api/weather?${query.toString()}`);
      const data = await res.json();
      console.log("API response", data);

      if (!res.ok) {
        console.log("No results or error");
        return;
      }

      // update data
      setLocation({ lat: data.lat, long: data.long });
      setFetchedPlace(data.resolved || "");
      setCoords({ lat: data.lat, long: data.long });

      // prepare for comparison
      const inputCity = city.trim().toLowerCase();
      const apiCity = String(data.name || "")
        .trim()
        .toLowerCase();
      const abbr = stateInit.trim().toUpperCase();
      const full = abbr ? US_STATE_BY_ABBR[abbr] || "" : "";
      const apiAdmin = String(data.admin1 || "")
        .trim()
        .toLowerCase();

      //check if city matches exactly, and if state does too (if user inputted it, optional)
      let exact = inputCity === apiCity;
      if (abbr) exact = exact && full.toLowerCase() === apiAdmin;

      setIsClosestMatch(!exact);
    } catch (err) {
      console.error("Request failed", err);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="p-2 border border-gray-300 rounded w-full"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          list="state-options"
          className="p-2 border border-gray-300 rounded w-28"
          placeholder="State, e.g., MA"
          value={stateInit}
          maxLength={2}
          onChange={(e) => setStateInit(e.target.value.toUpperCase())}
        />
        <datalist id="state-options">
          {STATE_LIST.map((s) => (
            <option key={s.abbr} value={s.abbr} label={s.label} />
          ))}
        </datalist>

        <button
          type="submit"
          className="px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none active:scale-95"
        >
          Search
        </button>
      </form>

      {fetchedPlace && (
        <div className="mt-3 text-sm text-center text-gray-700">
          <p>
            {isClosestMatch ? "Closest match:" : "Results for"} {fetchedPlace}
          </p>
        </div>
      )}
    </div>
  );
}
