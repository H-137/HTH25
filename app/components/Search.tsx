export default function Search({ setLocation }: { setLocation: (location: { lat: number; long: number }) => void }) {
    return (
        <div>
            <input type="text" placeholder="Search..." className="p-2 border rounded w-full" />
        </div>
    )
}