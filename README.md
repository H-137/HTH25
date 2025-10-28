## Authors:
Matt Leopold, Indel Garcia, Alex Lehman

## Research Assistants:

Brendan Reiners

# Climate Delta

Climate Delta is an interactive climate insights application that helps communities explore how local conditions have changed over time and how they are projected to evolve. By combining historical environmental data, real-time satellite imagery, and machine learning forecasts, the app translates complex climate information into intuitive visuals for every U.S. county.

## Why We Built This

Climate change discussions often focus on global trends, leaving people uncertain about how their hometowns are affected. Most Americans believe global warming is real yet feel disconnected from its personal impact, and conversations about the topic remain infrequent. Climate Delta closes this awareness gap by delivering localized, data-driven insights so residents, policymakers, and researchers can make informed decisions about sustainability, infrastructure, and adaptation strategies.

## Project Goals

- Increase awareness of how climate change is affecting local communities today and in the future.
- Encourage more frequent and informed conversations about global warming by presenting localized, easy-to-understand data stories.
- Empower decision-makers with actionable insights backed by reputable scientific data sources and predictive modeling.

## Tech Stack

- **Framework:** Next.js (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Processing & Analysis:** Python-based pipelines with machine learning (GRU neural networks)
- **Mapping & Visualization:** Mapbox GL JS, D3.js, and custom chart components
- **Deployment:** Vercel

## Data & Methodology

- **Temperature & Meteorological Data:** National Oceanic and Atmospheric Administration (NOAA) historical records accessed through the Open-Meteo API, with additional meteorological data from the National Centers for Environmental Information (NCEI).
- **Analysis:** An 11-year moving average smooths short-term fluctuations (aligned with the solar activity cycle) to highlight long-term temperature trends.
- **Machine Learning:** A Gated Recurrent Unit (GRU) neural network trained on historical NOAA datasets projects
- **Satellite Imagery:** Time-lapse visualizations stitch together imagery from Landsat 5 and Landsat 8 satellites, sourced via Google Earth Engine. For each location, a 10 km × 10 km area centered on local latitude/longitude coordinates is sampled. Images captured between June 19 and August 30 with low cloud cover are composited to represent each year from 1984 through 2025, offering a clear view of environmental change.

## Installation

1. Ensure you have Node.js (v18 or later) and npm installed.
2. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

## Running the App

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to explore the dashboard.

## Validity Statement

Climate Delta relies on authoritative data providers such as the National Weather Service (NWS) and the National Oceanic and Atmospheric Administration (NOAA). These agencies have set the standard for U.S. weather observation for more than fifty years, ensuring the app’s insights are grounded in trusted, scientifically rigorous measurements.

## Additional Resources

- [Yale Program on Climate Change Communication – YCOM Visualizations](https://climatecommunication.yale.edu/visualizations-data/ycom-us/)

We welcome contributions and feedback that help us improve the way people understand climate change at the local level.

## Note: 

Project deployment is not fully live at this time, but the codebase is available for review and local testing. Keys and sensitive information have been omitted for security, and certain features may be disabled in this version.