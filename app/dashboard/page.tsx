import { Logout } from "@/components/logout";

export default function Dashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
            <p className="text-lg">This is the dashboard page.</p>
            <Logout />
        </div>
    );
}
