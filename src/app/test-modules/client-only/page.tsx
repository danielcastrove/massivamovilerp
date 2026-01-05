export default function ClientOnlyPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold">Client Only Module</h1>
      <p className="mt-3 text-2xl">
        This module should only be accessible by users with the CLIENTE role.
      </p>
    </div>
  );
}
