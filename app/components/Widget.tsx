export default function Widget({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-4 border rounded shadow-md bg-white">
            {children}
        </div>
    );
}