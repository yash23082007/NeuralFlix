import { MoodSelector } from "../../components/recommendation/MoodSelector";

export default function MoodPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20 page-enter">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <MoodSelector />
      </div>
    </main>
  );
}
