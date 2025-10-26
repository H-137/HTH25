'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface ImageData {
  img: HTMLImageElement;
  year: number;
}

export default function ImageSlider(location: { lat: number; long: number } | null) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch images when location changes
  useEffect(() => {
    const target = location;
    if (!target || target.long === 0) return;

    const fetchImages = async () => {
      setLoading(true);
      try {
        const metaRes = await axios.get(`/api/gee?lat=${target.lat}&lng=${target.long}&mode=meta`);
        const { timestamps } = metaRes.data;

        const loadedImages: ImageData[] = [];
        let loadedCount = 0;

        timestamps.forEach((ts: string) => {
          axios
            .get(`/api/gee?ts=${ts}&lat=${target.lat}&lng=${target.long}`)
            .then(res => {
              const image = new Image();
              image.src = res.data.url;
              image.onload = () => {
                loadedImages.push({ img: image, year: res.data.year });
                loadedCount++;
                setImages(loadedImages.sort((a, b) => a.year - b.year));
                if (loadedCount === timestamps.length) {
                  setLoading(false);
                }
              };
            })
            .catch(err => console.error('Thumbnail fetch failed:', err));
        });
      } catch (err) {
        console.error('Metadata fetch failed:', err);
        setLoading(false);
      }
    };
    fetchImages();
  }, [location]);

  // Start looping only after loading is complete
  useEffect(() => {
    if (loading || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 200);

    return () => clearInterval(interval);
  }, [loading, images]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value));
  };

  if (loading && images.length === 0) return <p>Loading images...</p>;
  if (images.length === 0) return <p>No images found.</p>;

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="w-[400px] h-[400px] border border-gray-300 mb-4 relative">
        {images[currentIndex] && (
          <img
            src={images[currentIndex].img.src}
            alt={`Year ${images[currentIndex].year}`}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
)}

        { images[currentIndex] && (<p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 p-1 rounded">
          Year: {images[currentIndex].year}
        </p>) }
      </div>

      <input
        type="range"
        min="0"
        max={images.length - 1}
        value={currentIndex}
        onChange={handleSliderChange}
        className="w-full transition-all duration-300 ease-in-out"
      />
    </div>
  );
}
