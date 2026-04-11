import { MoodSelector } from '../../components/recommendation/MoodSelector';

export default function MoodPage() {
  return (
    <div className="min-h-screen bg-bg-void text-white p-8">
      <div className="flex flex-col items-center max-w-7xl mx-auto space-y-12">
        
        {/* Animated Banner */}
        <div className="bg-gradient-to-r from-neural-purple via-neural-crimson to-neural-electric bg-clip-text text-transparent font-display font-black text-6xl md:text-8xl text-center pb-6">
          NeuralFlix Moods
        </div>

        {/* Client Mood UI */}
        <MoodSelector />

        {/* Scaffold space waiting for the Next Query Feed... */}
        <div id="Movie-Injection-Area" className="w-full min-h-64 border border-dashed border-gray-800 rounded-3xl flex items-center justify-center p-8 bg-black/50">
          <p className="text-gray-500 font-mono text-center">
            Pick a mood to populate the intelligent recommendations flow.
            <br/>(Awaiting API bindings)
          </p>
        </div>

      </div>
    </div>
  )
}